package auth

import (
	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/middleware"
)

func RegisterRoutes(app *fiber.App, db *pgxpool.Pool) {
	h := &handler{db: db}

	g := app.Group("/auth")
	g.Post("/request-otp", h.requestOTP)
	g.Post("/verify-otp", h.verifyOTP)
	g.Post("/register", h.register)
	g.Get("/me", middleware.RequireAuth(db), h.me)
	g.Post("/logout", h.logout)
}
