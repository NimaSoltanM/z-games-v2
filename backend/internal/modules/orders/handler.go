package orders

import (
	"errors"
	"fmt"
	"log"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/middleware"
)

type handler struct {
	db          *pgxpool.Pool
	zp          *zarinpalClient
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

	orderID, err := createPendingOrder(c.Context(), h.db, userID, total, referral, items)
	if err != nil {
		return err
	}

	authority, err := h.zp.requestPayment(c.Context(), total, "خرید بازی از Z-Games", h.callbackURL,
		map[string]string{"order_id": orderID})
	if err != nil {
		_ = failOrder(c.Context(), h.db, orderID)
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

// listOrders returns the current user's paid orders for their dashboard.
func (h *handler) listOrders(c fiber.Ctx) error {
	userID := c.Locals(middleware.LocalUserID).(string)
	orders, err := listUserOrders(c.Context(), h.db, userID)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"orders": orders})
}

// getOrder returns a single order owned by the user (404 if not theirs).
func (h *handler) getOrder(c fiber.Ctx) error {
	userID := c.Locals(middleware.LocalUserID).(string)
	id := c.Params("id")

	order, err := getUserOrder(c.Context(), h.db, userID, id)
	if err != nil {
		return err
	}
	if order == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "سفارش مورد نظر یافت نشد"})
	}
	return c.JSON(order)
}

// callback is where ZarinPal returns the buyer's browser after payment. It
// verifies server-side, marks the order paid, clears the cart, then redirects to
// the frontend result page. No auth: the order is identified by its authority.
func (h *handler) callback(c fiber.Ctx) error {
	authority := c.Query("Authority")
	status := c.Query("Status")

	if authority == "" {
		return h.redirectResult(c, "failed", "")
	}

	order, err := getOrderByAuthority(c.Context(), h.db, authority)
	if err != nil {
		return err
	}
	if order == nil {
		return h.redirectResult(c, "failed", "")
	}

	if status != "OK" {
		_ = failOrder(c.Context(), h.db, order.ID)
		return h.redirectResult(c, "failed", order.ID)
	}

	refID, err := h.zp.verifyPayment(c.Context(), order.Amount, authority)
	if err != nil {
		_ = failOrder(c.Context(), h.db, order.ID)
		log.Printf("zarinpal verify failed for order %s: %v", order.ID, err)
		return h.redirectResult(c, "failed", order.ID)
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
	return h.redirectResult(c, "success", order.ID)
}

func (h *handler) redirectResult(c fiber.Ctx, status, orderID string) error {
	url := fmt.Sprintf("%s/payment/result?status=%s", h.frontendURL, status)
	if orderID != "" {
		url += "&order=" + orderID
	}
	return c.Redirect().To(url)
}
