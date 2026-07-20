package auth

import (
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/middleware"
)

func RegisterRoutes(app *fiber.App, db *pgxpool.Pool) {
	h := &handler{db: db, otpSender: payamakPanelSenderFromEnv()}

	// Per-IP throttle on the unauthenticated, abuse-prone auth writes (shared
	// budget) on top of the per-phone/per-OTP limits in the service layer.
	authLimit := middleware.RateLimiter(10, time.Minute)

	g := app.Group("/auth")
	g.Post("/request-otp", authLimit, h.requestOTP)
	g.Post("/verify-otp", authLimit, h.verifyOTP)
	g.Post("/register", authLimit, h.register)
	g.Get("/me", middleware.RequireAuth(db), h.me)
	g.Post("/logout", h.logout)
}
