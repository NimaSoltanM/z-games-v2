package audit

import (
	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/middleware"
)

// RegisterRoutes mounts the admin-only audit log read endpoints.
func RegisterRoutes(app *fiber.App, db *pgxpool.Pool) {
	h := &handler{db: db}

	g := app.Group("/admin/audit", middleware.RequireAdmin(db))
	g.Get("/", h.list)
	g.Get("/admins", h.actors)
}
