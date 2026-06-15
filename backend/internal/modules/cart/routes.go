package cart

import (
	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/middleware"
)

func RegisterRoutes(app *fiber.App, db *pgxpool.Pool) {
	h := &handler{db: db}
	auth := middleware.RequireAuth(db)

	g := app.Group("/cart", auth)
	g.Get("/", h.getCart)
	g.Post("/items", h.addItem)
	g.Patch("/items", h.updateItem)
	g.Delete("/items", h.removeItem)
	g.Delete("/", h.clearCart)
	g.Post("/merge", h.mergeCartHandler)
}
