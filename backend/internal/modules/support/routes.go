package support

import (
	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/middleware"
)

func RegisterRoutes(app *fiber.App, db *pgxpool.Pool) {
	h := &handler{db: db}
	auth := middleware.RequireAuth(db)
	app.Get("/support/tickets", auth, h.listMine)
	app.Post("/support/tickets", auth, h.create)
	app.Get("/support/tickets/:id", auth, h.getMine)
	app.Post("/support/tickets/:id/replies", auth, h.replyMine)

	admin := middleware.RequireAdmin(db)
	app.Get("/admin/support/tickets", admin, h.adminList)
	app.Get("/admin/support/tickets/:id", admin, h.getAdmin)
	app.Post("/admin/support/tickets/:id/replies", admin, h.replyAdmin)
	app.Patch("/admin/support/tickets/:id/status", admin, h.adminStatus)
}
