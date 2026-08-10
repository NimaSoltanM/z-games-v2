package orders

import (
	"errors"
	"fmt"
	"log"
	"net/url"
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
	fingerprint := cartFingerprint(items, total, referral)
	pending, err := findPendingCheckout(c.Context(), h.db, userID)
	if err != nil {
		return err
	}
	if pending != nil {
		if pending.Fingerprint != nil && *pending.Fingerprint == fingerprint && pending.Authority != nil && *pending.Authority != "" {
			return c.JSON(fiber.Map{
				"payment_url":  h.zp.paymentURL(*pending.Authority),
				"order_id":     pending.OrderID,
				"order_number": pending.OrderNumber,
			})
		}
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"message": "یک پرداخت ناتمام دارید. لطفاً پرداخت قبلی را تکمیل کنید یا چند دقیقه دیگر دوباره تلاش کنید",
		})
	}

	// Apply any in-website wallet balance first. If it covers the whole order the
	// order is created already paid and we skip ZarinPal entirely; otherwise the
	// wallet is reserved and ZarinPal charges only the remainder.
	balance, err := userWalletBalance(c.Context(), h.db, userID)
	if err != nil {
		return err
	}
	walletApplied, gateway := splitWallet(balance, total)

	orderID, orderNumber, paid, err := createPendingCheckout(c.Context(), h.db, userID, total, walletApplied, referral, items, fingerprint)
	if errors.Is(err, ErrInsufficientWallet) {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"message": "موجودی کیف پول شما تغییر کرده است. لطفاً دوباره تلاش کنید",
		})
	}
	if errors.Is(err, ErrCheckoutPending) {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"message": "یک پرداخت ناتمام دارید. لطفاً پرداخت قبلی را تکمیل کنید یا چند دقیقه دیگر دوباره تلاش کنید",
		})
	}
	if errors.Is(err, ErrCheckoutRateLimit) {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"message": "تعداد تلاش‌های پرداخت شما بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید",
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
		return c.JSON(fiber.Map{
			"paid":         true,
			"order_id":     orderID,
			"order_number": orderNumber,
		})
	}

	// Keep verification under our control even if the gateway's panel default is
	// changed later. This prevents a callback/auto-verify race and lets the stale
	// order reconciler safely recover a lost callback.
	authority, err := h.zp.requestPayment(
		c.Context(),
		gateway,
		fmt.Sprintf("خرید سفارش %d از زد گیمز", orderNumber),
		h.callbackURL,
		map[string]any{
			"auto_verify": false,
			"order_id":    strconv.FormatInt(orderNumber, 10),
		},
	)
	if err != nil {
		if failErr := failOrder(c.Context(), h.db, orderID); failErr != nil {
			log.Printf("refund after ZarinPal request failure for order %s failed: %v", orderID, failErr)
		}
		log.Printf("zarinpal request failed for order %s: %v", orderID, err)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"message": "خطا در اتصال به درگاه پرداخت. لطفاً دوباره تلاش کنید",
		})
	}

	if err := setOrderAuthority(c.Context(), h.db, orderID, authority); err != nil {
		// The buyer has not received the gateway URL yet, so this session cannot be
		// paid through our UI. Release any reserved wallet credit immediately.
		if failErr := failOrder(c.Context(), h.db, orderID); failErr != nil {
			log.Printf("refund after authority persistence failure for order %s failed: %v", orderID, failErr)
		}
		return err
	}

	return c.JSON(fiber.Map{
		"payment_url":  h.zp.paymentURL(authority),
		"order_id":     orderID,
		"order_number": orderNumber,
	})
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

func (h *handler) requestVerificationCode(c fiber.Ctx) error {
	userID := c.Locals(middleware.LocalUserID).(string)
	var body struct {
		OrderItemID string `json:"order_item_id"`
	}
	if err := c.Bind().JSON(&body); err != nil || strings.TrimSpace(body.OrderItemID) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "حساب موردنظر مشخص نشده است"})
	}
	request, err := requestVerificationCode(c.Context(), h.db, userID, strings.TrimSpace(body.OrderItemID))
	var cooldown *verificationCooldownError
	switch {
	case errors.Is(err, ErrVerificationItemNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "حساب تحویل‌شده موردنظر یافت نشد"})
	case errors.Is(err, ErrVerificationIneligible):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "درخواست کد ورود مجدد برای این نوع حساب فعال نیست"})
	case errors.Is(err, ErrVerificationPending):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"message": "یک درخواست کد در انتظار پاسخ پشتیبانی دارید"})
	case errors.Is(err, ErrVerificationActive):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"message": "کد فعلی شما هنوز معتبر است"})
	case errors.As(err, &cooldown):
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"message":  "در هر ۲۴ ساعت فقط یک درخواست کد ورود می‌توانید ثبت کنید",
			"retry_at": cooldown.RetryAt,
		})
	case err != nil:
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(request)
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

func (h *handler) adminListVerificationCodes(c fiber.Ctx) error {
	page, limit, offset := pageParams(c)
	requests, total, err := listAdminVerificationRequests(c.Context(), h.db, h.cred, verificationFilter{
		status: c.Query("status"), search: strings.TrimSpace(c.Query("search")), limit: limit, offset: offset,
	})
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"requests": requests, "pagination": pagination(page, limit, total)})
}

func (h *handler) adminSendVerificationCode(c fiber.Ctx) error {
	adminID := c.Locals(middleware.LocalUserID).(string)
	var body struct {
		Code           string `json:"code"`
		AllowDuplicate bool   `json:"allow_duplicate"`
	}
	if err := c.Bind().JSON(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}
	matches, err := sendVerificationCode(c.Context(), h.db, h.cred, adminID, c.Params("id"), body.Code, body.AllowDuplicate)
	switch {
	case errors.Is(err, ErrVerificationCodeInvalid):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "کد ورود معتبر نیست"})
	case errors.Is(err, ErrVerificationRequestNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "درخواست کد یافت نشد"})
	case errors.Is(err, ErrVerificationRequestNotPending):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"message": "این درخواست قبلاً پاسخ داده شده است"})
	case err != nil:
		return err
	}
	if len(matches) > 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"code":    "DUPLICATE_VERIFICATION_CODE",
			"message": "این کد ورود در ۲۴ ساعت گذشته برای مشتری دیگری ارسال شده است",
			"matches": matches,
		})
	}
	return c.JSON(fiber.Map{"message": "کد ورود ارسال شد"})
}

func (h *handler) adminFulfill(c fiber.Ctx) error {
	adminID := c.Locals(middleware.LocalUserID).(string)
	orderID := c.Params("id")

	var body struct {
		AllowDuplicate bool `json:"allow_duplicate"`
		Items          []struct {
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

	warnings, err := fulfillOrder(c.Context(), h.db, h.cred, adminID, orderID, creds, body.AllowDuplicate)
	switch {
	case errors.Is(err, ErrOrderNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "سفارش مورد نظر یافت نشد"})
	case errors.Is(err, ErrNotFulfillable):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "این سفارش قابل تکمیل نیست"})
	case errors.Is(err, ErrItemNotInOrder):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "موردی نامعتبر برای این سفارش ارسال شده است"})
	case errors.Is(err, ErrReturnedItemImmutable):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"message": "اطلاعات حساب بازگردانده‌شده قابل ویرایش نیست"})
	case err != nil:
		return err
	}
	if len(warnings) > 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"code":     "DUPLICATE_CREDENTIALS",
			"message":  "این اطلاعات اکانت قبلاً برای سفارش دیگری ثبت شده است",
			"warnings": warnings,
		})
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
		ReturnID       string `json:"return_id"`
		AllowDuplicate bool   `json:"allow_duplicate"`
	}
	if err := c.Bind().JSON(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}
	returnID := strings.TrimSpace(body.ReturnID)
	if returnID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "حساب بازگردانده‌شده انتخاب نشده است"})
	}

	warnings, err := reuseReturnedAccount(c.Context(), h.db, h.cred, adminID, orderID, itemID, returnID, body.AllowDuplicate)
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
	case errors.Is(err, ErrReturnedItemImmutable):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"message": "اطلاعات حساب بازگردانده‌شده قابل ویرایش نیست"})
	case err != nil:
		return err
	}
	if len(warnings) > 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"code":     "DUPLICATE_CREDENTIALS",
			"message":  "این اطلاعات اکانت قبلاً برای سفارش دیگری ثبت شده است",
			"warnings": warnings,
		})
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
		return h.redirectResult(c, "failed", nil, 0)
	}

	order, err := getOrderByAuthority(c.Context(), h.db, authority)
	if err != nil {
		return err
	}
	if order == nil {
		return h.redirectResult(c, "failed", nil, 0)
	}

	// Idempotent: if this order is already settled, don't re-verify. ZarinPal can
	// hit the callback more than once, and re-verifying a paid order would risk a
	// transient verify error being misread as "pending" for money already taken.
	if order.Status == "paid" || order.Status == "fulfilled" {
		return h.redirectResult(c, "success", order, order.ReferenceID())
	}
	if order.Status == "failed" {
		return h.redirectResult(c, "failed", order, 0)
	}

	// The customer cancelled or the gateway reported a non-OK return.
	if status != "OK" {
		// Do not settle from a browser-controlled query parameter. Keeping the
		// order pending until the stale reconciler verifies it avoids refunding
		// wallet credit while a payment session might still be usable elsewhere.
		return h.redirectResult(c, "failed", order, 0)
	}

	refID, err := h.zp.verifyPayment(c.Context(), order.GatewayAmount(), authority)
	switch {
	case errors.Is(err, ErrPaymentNotVerified):
		// ZarinPal answered cleanly: the payment did not go through.
		if failErr := failOrder(c.Context(), h.db, order.ID); failErr != nil {
			log.Printf("fail unverified order %s: %v", order.ID, failErr)
			return h.redirectResult(c, "pending", order, 0)
		}
		log.Printf("zarinpal verify: payment not verified for order %s: %v", order.ID, err)
		return h.redirectResult(c, "failed", order, 0)
	case err != nil:
		// UNKNOWN outcome (timeout/network/gateway error). The customer may have
		// paid — leave the order pending for reconciliation instead of failing it.
		log.Printf("zarinpal verify UNKNOWN for order %s (authority %s): %v — leaving pending", order.ID, authority, err)
		return h.redirectResult(c, "pending", order, 0)
	}

	transitioned, err := markOrderPaid(c.Context(), h.db, order.ID, refID)
	if err != nil {
		// Verification succeeded but persistence did not. Never show failure; the
		// reconciler can repeat verify (101) and settle the order safely.
		log.Printf("persist verified payment for order %s failed: %v", order.ID, err)
		return h.redirectResult(c, "pending", order, 0)
	}
	if transitioned {
		if err := clearUserCart(c.Context(), h.db, order.UserID); err != nil {
			log.Printf("clear cart after paid order %s failed: %v", order.ID, err)
		}
		return h.redirectResult(c, "success", order, refID)
	}

	// Another callback/reconciler settled the row while verify was in flight.
	// Reload before deciding what the buyer should see.
	current, err := getOrderByAuthority(c.Context(), h.db, authority)
	if err != nil {
		log.Printf("reload concurrently settled order %s failed: %v", order.ID, err)
		return h.redirectResult(c, "pending", order, 0)
	}
	if current != nil && (current.Status == "paid" || current.Status == "fulfilled") {
		return h.redirectResult(c, "success", current, current.ReferenceID())
	}
	log.Printf("verified payment for order %s could not transition from status %q", order.ID, order.Status)
	return h.redirectResult(c, "pending", order, 0)
}

func (h *handler) redirectResult(c fiber.Ctx, status string, order *orderLookup, refID int64) error {
	target, err := url.Parse(h.frontendURL + "/payment/result")
	if err != nil {
		return fmt.Errorf("payment result URL: %w", err)
	}
	query := target.Query()
	query.Set("status", status)
	if order != nil {
		query.Set("id", order.ID)
		query.Set("order", strconv.FormatInt(order.OrderNumber, 10))
	}
	if refID > 0 {
		query.Set("ref", strconv.FormatInt(refID, 10))
	}
	target.RawQuery = query.Encode()
	return c.Redirect().To(target.String())
}
