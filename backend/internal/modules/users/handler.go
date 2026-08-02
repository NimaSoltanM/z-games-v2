package users

import (
	"strconv"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
)

const usersPageSize = 50

type handler struct {
	db *pgxpool.Pool
}

func (h *handler) list(c fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page"))
	if page < 1 {
		page = 1
	}

	users, total, err := listUsers(c.Context(), h.db, usersPageSize, (page-1)*usersPageSize)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"message": "خطا در دریافت فهرست کاربران",
		})
	}

	totalPages := 0
	if total > 0 {
		totalPages = (total + usersPageSize - 1) / usersPageSize
	}
	return c.JSON(fiber.Map{
		"users": users,
		"pagination": fiber.Map{
			"page":        page,
			"limit":       usersPageSize,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}
