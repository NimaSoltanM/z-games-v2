package games

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/paginate"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/middleware"
)

func RegisterRoutes(app *fiber.App, db *pgxpool.Pool) {
	h := &handler{db: db}

	g := app.Group("/games")

	g.Get("/", paginate.New(paginate.Config{
		SortKey:      "sort",
		DefaultSort:  "created_at",
		DefaultLimit: 20,
		MaxLimit:     100,
		AllowedSorts: []string{"name", "created_at", "platform"},
	}), h.listGamesHandler)

	g.Get("/exchange-rate", h.getExchangeRateHandler)

	// Admin game management. Static segments (/all, /exchange-rate) are registered
	// before the "/:id" param routes so they take precedence.
	admin := g.Group("/admin", middleware.RequireAdmin(db))
	admin.Get("/all", h.adminListGames)
	admin.Get("/slug-available", h.slugAvailableHandler)
	admin.Get("/exchange-rate", h.adminGetExchangeRate)
	admin.Post("/exchange-rate", h.adminSetExchangeRate)
	admin.Post("/", h.adminCreateGame)
	admin.Get("/:id", h.adminGetGame)
	admin.Patch("/:id", h.adminUpdateGame)
	admin.Delete("/:id", h.adminDeleteGame)
	admin.Patch("/:id/preorder", h.adminSetPreorder)
	admin.Patch("/:id/alert", h.adminSetAlert)
	admin.Patch("/:id/discount", h.adminSetDiscount)
	admin.Patch("/:id/return-fee", h.adminSetReturnFee)

	// Public single-game lookup — kept last so it never shadows /games/admin/*.
	g.Get("/:id/related", h.relatedGamesHandler)
	g.Get("/:id", h.getGameHandler)
}
