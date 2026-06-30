package orders

import (
	"errors"
	"fmt"
	"log"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/credentials"
	"github.com/soltanmohammdi/z-games/internal/shared/middleware"
)

type handler struct {
	db          *pgxpool.Pool
	zp          *zarinpalClient
	cred        *credentials.Cipher
	frontendURL string
	callbackURL string
}

// checkout turns the user's cart into a pending order and starts a ZarinPal
// payment, returning the gateway URL the client should redirect to.
func (h *handler) checkout(c fiber.Ctx) error {
	userID := c.Locals(middleware.LocalUserID).(string)

	var body struct {
		ReferralCode string `json:"referral_code"`
	}
	_ = c.Bind().JSON(&body) // body is optional (referral only)
	referral := strings.TrimSpace(body.ReferralCode)

	items, total, err := computeCart(c.Context(), h.db, userID)
	if errors.Is(err, ErrCartEmpty) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "سبد خرید شما خالی است"})
	}
	if errors.Is(err, ErrInvalidCart) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "برخی از موارد سبد خرید شما دیگر در دسترس نیستند. لطفاً سبد خرید را بازبینی کنید",
		})
	}
	if err != nil {
		return err
	}

	// Apply any in-website wallet balance first. If it covers the whole order the
	// order is created already paid and we skip ZarinPal entirely; otherwise the
	// wallet is reserved and ZarinPal charges only the remainder.
	balance, err := userWalletBalance(c.Context(), h.db, userID)
	if err != nil {
		return err
	}
	walletApplied, gateway := splitWallet(balance, total)

	orderID, orderNumber, paid, err := createPendingOrder(c.Context(), h.db, userID, total, walletApplied, referral, items)
	if errors.Is(err, ErrInsufficientWallet) {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"message": "موجودی کیف پول شما تغییر کرده است. لطفاً دوباره تلاش کنید",
		})
	}
	if err != nil {
		return err
	}

	if paid {
		// Fully covered by the wallet — no gateway round-trip. Clear the cart and
		// report success so the client can go straight to the result page.
		if err := clearUserCart(c.Context(), h.db, userID); err != nil {
			log.Printf("clear cart after wallet-paid order %s failed: %v", orderID, err)
		}
		return c.JSON(fiber.Map{"paid": true, "order_number": orderNumber})
	}

	authority, err := h.zp.requestPayment(c.Context(), gateway, "خرید بازی از Z-Games", h.callbackURL,
		map[string]string{"order_id": orderID})
	if err != nil {
		_ = failOrder(c.Context(), h.db, orderID) // refunds the reserved wallet
		log.Printf("zarinpal request failed for order %s: %v", orderID, err)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"message": "خطا در اتصال به درگاه پرداخت. لطفاً دوباره تلاش کنید",
		})
	}

	if err := setOrderAuthority(c.Context(), h.db, orderID, authority); err != nil {
		return err
	}

	return c.JSON(fiber.Map{"payment_url": h.zp.paymentURL(authority)})
}

// getWalletView returns the user's wallet balance and recent ledger entries.
func (h *handler) getWalletView(c fiber.Ctx) error {
	userID := c.Locals(middleware.LocalUserID).(string)
	w, err := getWallet(c.Context(), h.db, userID)
	if err != nil {
		return err
	}
	return c.JSON(w)
}

// listOrders returns a page of the current user's orders for their dashboard,
// optionally filtered by ?status=paid|fulfilled.
func (h *handler) listOrders(c fiber.Ctx) error {
	userID := c.Locals(middleware.LocalUserID).(string)
	page, limit, offset := pageParams(c)
	orders, total, err := listUserOrders(c.Context(), h.db, h.cred, userID, c.Query("status"), limit, offset)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"orders": orders, "pagination": pagination(page, limit, total)})
}

// getOrder returns a single order owned by the user (404 if not theirs).
func (h *handler) getOrder(c fiber.Ctx) error {
	userID := c.Locals(middleware.LocalUserID).(string)
	id := c.Params("id")

	order, err := getUserOrder(c.Context(), h.db, h.cred, userID, id)
	if err != nil {
		return err
	}
	if order == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "سفارش مورد نظر یافت نشد"})
	}
	return c.JSON(order)
}

// --- admin ------------------------------------------------------------------

func (h *handler) adminListOrders(c fiber.Ctx) error {
	page, limit, offset := pageParams(c)
	orders, total, err := listAdminOrders(c.Context(), h.db, h.cred, adminOrderFilter{
		status: c.Query("status"),
		search: strings.TrimSpace(c.Query("search")),
		limit:  limit,
		offset: offset,
	})
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"orders": orders, "pagination": pagination(page, limit, total)})
}

// pageParams reads ?page and ?limit, clamped to sane bounds (limit 1..100).
func pageParams(c fiber.Ctx) (page, limit, offset int) {
	page, _ = strconv.Atoi(c.Query("page"))
	if page < 1 {
		page = 1
	}
	limit, _ = strconv.Atoi(c.Query("limit"))
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return page, limit, (page - 1) * limit
}

func pagination(page, limit, total int) fiber.Map {
	totalPages := 1
	if total > 0 && limit > 0 {
		totalPages = (total + limit - 1) / limit
	}
	return fiber.Map{"page": page, "limit": limit, "total": total, "total_pages": totalPages}
}

func (h *handler) adminGetOrder(c fiber.Ctx) error {
	order, err := getAdminOrder(c.Context(), h.db, h.cred, c.Params("id"))
	if err != nil {
		return err
	}
	if order == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "سفارش مورد نظر یافت نشد"})
	}
	return c.JSON(order)
}

func (h *handler) adminFulfill(c fiber.Ctx) error {
	adminID := c.Locals(middleware.LocalUserID).(string)
	orderID := c.Params("id")

	var body struct {
		Items []struct {
			ID       string `json:"id"`
			Email    string `json:"email"`
			Password string `json:"password"`
			Passcode string `json:"passcode"`
		} `json:"items"`
	}
	if err := c.Bind().JSON(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}
	if len(body.Items) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "هیچ موردی برای ثبت ارسال نشده است"})
	}

	creds := make([]credInput, len(body.Items))
	for i, it := range body.Items {
		creds[i] = credInput{
			ItemID:   it.ID,
			Email:    strings.TrimSpace(it.Email),
			Password: strings.TrimSpace(it.Password),
			Passcode: strings.TrimSpace(it.Passcode),
		}
	}

	err := fulfillOrder(c.Context(), h.db, h.cred, adminID, orderID, creds)
	switch {
	case errors.Is(err, ErrOrderNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "سفارش مورد نظر یافت نشد"})
	case errors.Is(err, ErrNotFulfillable):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "این سفارش قابل تکمیل نیست"})
	case errors.Is(err, ErrItemNotInOrder):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "موردی نامعتبر برای این سفارش ارسال شده است"})
	case err != nil:
		return err
	}

	order, err := getAdminOrder(c.Context(), h.db, h.cred, orderID)
	if err != nil {
		return err
	}
	return c.JSON(order)
}

// adminReuseReturn fulfills one order item from returned-account inventory: the
// chosen approved return's credentials are copied onto the item and that return is
// consumed. Returns the updated order (with refreshed inventory).
func (h *handler) adminReuseReturn(c fiber.Ctx) error {
	adminID := c.Locals(middleware.LocalUserID).(string)
	orderID := c.Params("id")
	itemID := c.Params("itemId")

	var body struct {
		ReturnID string `json:"return_id"`
	}
	if err := c.Bind().JSON(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}
	returnID := strings.TrimSpace(body.ReturnID)
	if returnID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "حساب بازگردانده‌شده انتخاب نشده است"})
	}

	err := reuseReturnedAccount(c.Context(), h.db, adminID, orderID, itemID, returnID)
	switch {
	case errors.Is(err, ErrItemNotInOrder):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "مورد سفارش یافت نشد"})
	case errors.Is(err, ErrNotFulfillable):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "این سفارش قابل تکمیل نیست"})
	case errors.Is(err, ErrReturnNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "حساب بازگردانده‌شده یافت نشد"})
	case errors.Is(err, ErrReturnUnavailable):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"message": "این حساب دیگر در دسترس نیست"})
	case errors.Is(err, ErrReturnMismatch):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "این حساب با بازی، کنسول یا ظرفیت این سفارش همخوانی ندارد"})
	case err != nil:
		return err
	}
	return h.adminGetOrder(c)
}

// callback is where ZarinPal returns the buyer's browser after payment. It
// verifies server-side, marks the order paid, clears the cart, then redirects to
// the frontend result page. No auth: the order is identified by its authority.
func (h *handler) callback(c fiber.Ctx) error {
	authority := c.Query("Authority")
	status := c.Query("Status")

	if authority == "" {
		return h.redirectResult(c, "failed", 0)
	}

	order, err := getOrderByAuthority(c.Context(), h.db, authority)
	if err != nil {
		return err
	}
	if order == nil {
		return h.redirectResult(c, "failed", 0)
	}

	// Idempotent: if this order is already settled, don't re-verify. ZarinPal can
	// hit the callback more than once, and re-verifying a paid order would risk a
	// transient verify error being misread as "pending" for money already taken.
	if order.Status == "paid" || order.Status == "fulfilled" {
		return h.redirectResult(c, "success", order.OrderNumber)
	}

	// The customer cancelled or the gateway reported a non-OK return.
	if status != "OK" {
		_ = failOrder(c.Context(), h.db, order.ID)
		return h.redirectResult(c, "failed", order.OrderNumber)
	}

	refID, err := h.zp.verifyPayment(c.Context(), order.GatewayAmount(), authority)
	switch {
	case errors.Is(err, ErrPaymentNotVerified):
		// ZarinPal answered cleanly: the payment did not go through.
		_ = failOrder(c.Context(), h.db, order.ID)
		log.Printf("zarinpal verify: payment not verified for order %s: %v", order.ID, err)
		return h.redirectResult(c, "failed", order.OrderNumber)
	case err != nil:
		// UNKNOWN outcome (timeout/network/gateway error). The customer may have
		// paid — leave the order pending for reconciliation instead of failing it.
		log.Printf("zarinpal verify UNKNOWN for order %s (authority %s): %v — leaving pending", order.ID, authority, err)
		return h.redirectResult(c, "pending", order.OrderNumber)
	}

	transitioned, err := markOrderPaid(c.Context(), h.db, order.ID, refID)
	if err != nil {
		return err
	}
	if transitioned {
		if err := clearUserCart(c.Context(), h.db, order.UserID); err != nil {
			log.Printf("clear cart after paid order %s failed: %v", order.ID, err)
		}
	}
	return h.redirectResult(c, "success", order.OrderNumber)
}

func (h *handler) redirectResult(c fiber.Ctx, status string, orderNumber int64) error {
	url := fmt.Sprintf("%s/payment/result?status=%s", h.frontendURL, status)
	if orderNumber > 0 {
		url += "&order=" + strconv.FormatInt(orderNumber, 10)
	}
	return c.Redirect().To(url)
}
