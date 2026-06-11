package games

import (
	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/paginate"
	"github.com/jackc/pgx/v5/pgxpool"
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
	g.Get("/:id", h.getGameHandler)
}
