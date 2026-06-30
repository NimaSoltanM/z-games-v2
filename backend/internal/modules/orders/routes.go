package orders

import (
	"log"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/credentials"
	"github.com/soltanmohammdi/z-games/internal/shared/middleware"
)

func RegisterRoutes(app *fiber.App, db *pgxpool.Pool) {
	sandbox := os.Getenv("ZARINPAL_SANDBOX") != "false" // default to sandbox
	frontendURL := envOr("FRONTEND_URL", "http://localhost:3000")
	apiURL := envOr("API_PUBLIC_URL", "http://localhost:3002")

	cred, err := credentials.New(os.Getenv("CREDENTIALS_KEY"))
	if err != nil {
		log.Fatalf("credentials encryption: %v", err)
	}

	h := &handler{
		db:          db,
		zp:          newZarinpalClient(os.Getenv("ZARINPAL_MERCHANT_ID"), sandbox),
		cred:        cred,
		frontendURL: strings.TrimRight(frontendURL, "/"),
		callbackURL: strings.TrimRight(apiURL, "/") + "/payment/callback",
	}

	auth := middleware.RequireAuth(db)
	// Throttle order creation per IP — each checkout opens a pending order and
	// calls ZarinPal, so it's the most expensive endpoint to let anyone spam.
	checkoutLimit := middleware.RateLimiter(10, time.Minute)
	app.Post("/orders/checkout", checkoutLimit, auth, h.checkout)
	app.Get("/orders", auth, h.listOrders)
	app.Get("/orders/:id", auth, h.getOrder)
	app.Get("/wallet", auth, h.getWalletView)
	app.Get("/payment/callback", h.callback)

	// Background settlement of stale pending orders, so abandoned checkouts release
	// reserved wallet credit (and lost gateway callbacks still settle).
	startReconciler(db, h.zp)

	admin := middleware.RequireAdmin(db)
	app.Get("/admin/orders", admin, h.adminListOrders)
	app.Get("/admin/orders/:id", admin, h.adminGetOrder)
	app.Post("/admin/orders/:id/fulfill", admin, h.adminFulfill)
	app.Post("/admin/orders/:id/items/:itemId/reuse", admin, h.adminReuseReturn)
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
