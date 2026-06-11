package games

import (
	"fmt"
	"math"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/paginate"
	"github.com/jackc/pgx/v5/pgxpool"
)

var sortColMap = map[string]string{
	"name":       "name",
	"created_at": "created_at",
	"platform":   "platform",
}

type handler struct {
	db *pgxpool.Pool
}

func (h *handler) listGamesHandler(c fiber.Ctx) error {
	pageInfo, ok := paginate.FromContext(c)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "پارامترهای صفحه‌بندی نامعتبر است"})
	}

	filter := listFilter{
		platform:   strings.TrimSpace(c.Query("platform")),
		priceMode:  strings.TrimSpace(c.Query("price_mode")),
		search:     strings.TrimSpace(c.Query("search")),
		onlyActive: true,
	}

	orderBy := buildOrderBy(pageInfo.Sort)
	games, total, err := listGames(c.Context(), h.db, filter, orderBy, pageInfo.Limit, pageInfo.Start())
	if err != nil {
		return fmt.Errorf("list games: %w", err)
	}

	rate, err := getExchangeRate(c.Context(), h.db)
	if err != nil {
		return fmt.Errorf("get exchange rate: %w", err)
	}

	totalPages := 1
	if pageInfo.Limit > 0 && total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(pageInfo.Limit)))
	}

	return c.JSON(fiber.Map{
		"games":         games,
		"exchange_rate": rate,
		"pagination": fiber.Map{
			"page":        pageInfo.Page,
			"limit":       pageInfo.Limit,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

func (h *handler) getGameHandler(c fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "شناسه بازی الزامی است"})
	}

	game, err := getGameByID(c.Context(), h.db, id, true)
	if err != nil {
		return fmt.Errorf("get game: %w", err)
	}
	if game == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "بازی مورد نظر یافت نشد"})
	}

	rate, err := getExchangeRate(c.Context(), h.db)
	if err != nil {
		return fmt.Errorf("get exchange rate: %w", err)
	}

	return c.JSON(fiber.Map{
		"game":          game,
		"exchange_rate": rate,
	})
}

func (h *handler) getExchangeRateHandler(c fiber.Ctx) error {
	rate, err := getExchangeRate(c.Context(), h.db)
	if err != nil {
		return fmt.Errorf("get exchange rate: %w", err)
	}
	return c.JSON(fiber.Map{"exchange_rate": rate})
}

func buildOrderBy(sorts []paginate.SortField) string {
	var parts []string
	for _, s := range sorts {
		col, ok := sortColMap[s.Field]
		if !ok {
			continue
		}
		dir := "ASC"
		if s.Order == paginate.DESC {
			dir = "DESC"
		}
		parts = append(parts, col+" "+dir)
	}
	if len(parts) == 0 {
		return "created_at DESC"
	}
	return strings.Join(parts, ", ")
}
