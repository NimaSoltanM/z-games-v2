package users

import (
	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/middleware"
)

// RegisterRoutes mounts the superadmin-only user directory endpoint.
func RegisterRoutes(app *fiber.App, db *pgxpool.Pool) {
	h := &handler{db: db}
	app.Get("/admin/users", middleware.RequireSuperAdmin(db), h.list)
}
