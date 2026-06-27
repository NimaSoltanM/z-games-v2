package audit

import (
	"strconv"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
)

type handler struct {
	db *pgxpool.Pool
}

// list returns a filtered, paginated, newest-first page of admin actions.
func (h *handler) list(c fiber.Ctx) error {
	page, limit, offset := pageParams(c)
	f := listFilters{
		AdminID: c.Query("admin_id"),
		Action:  c.Query("action"),
	}

	actions, total, err := listActions(c.Context(), h.db, f, limit, offset)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "خطا در دریافت تاریخچه فعالیت"})
	}
	return c.JSON(fiber.Map{"actions": actions, "pagination": pagination(page, limit, total)})
}

// actors returns the admins present in the log, for the filter dropdown.
func (h *handler) actors(c fiber.Ctx) error {
	actors, err := listActors(c.Context(), h.db)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"message": "خطا در دریافت فهرست مدیران"})
	}
	return c.JSON(fiber.Map{"actors": actors})
}

// pageParams reads ?page and ?limit, clamped to sane bounds (limit 1..100).
func pageParams(c fiber.Ctx) (page, limit, offset int) {
	page, _ = strconv.Atoi(c.Query("page"))
	if page < 1 {
		page = 1
	}
	limit, _ = strconv.Atoi(c.Query("limit"))
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return page, limit, (page - 1) * limit
}

func pagination(page, limit, total int) fiber.Map {
	totalPages := 0
	if total > 0 && limit > 0 {
		totalPages = (total + limit - 1) / limit
	}
	return fiber.Map{"page": page, "limit": limit, "total": total, "total_pages": totalPages}
}
