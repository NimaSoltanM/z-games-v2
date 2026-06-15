package middleware

import (
	"context"
	"errors"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func loadUserRole(ctx context.Context, db *pgxpool.Pool, userID string) (string, error) {
	var role string
	err := db.QueryRow(ctx, "SELECT role FROM users WHERE id = $1 LIMIT 1", userID).Scan(&role)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", nil
	}
	return role, err
}

func RequireAuth(db *pgxpool.Pool) fiber.Handler {
	return func(c fiber.Ctx) error {
		token := c.Cookies("auth_token")
		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "لطفاً وارد شوید"})
		}

		userID, _, err := verifyAuthToken(token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "نشست منقضی شده است. لطفاً دوباره وارد شوید"})
		}

		role, err := loadUserRole(c.Context(), db, userID)
		if err != nil {
			return err
		}
		if role == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "نشست منقضی شده است. لطفاً دوباره وارد شوید"})
		}

		c.Locals(LocalUserID, userID)
		c.Locals(LocalUserRole, role)
		return c.Next()
	}
}

func RequireAdmin(db *pgxpool.Pool) fiber.Handler {
	return func(c fiber.Ctx) error {
		token := c.Cookies("auth_token")
		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "لطفاً وارد شوید"})
		}

		userID, _, err := verifyAuthToken(token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "نشست منقضی شده است. لطفاً دوباره وارد شوید"})
		}

		role, err := loadUserRole(c.Context(), db, userID)
		if err != nil {
			return err
		}
		if role == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "نشست منقضی شده است. لطفاً دوباره وارد شوید"})
		}
		if role == "user" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"message": "دسترسی مجاز نیست"})
		}

		c.Locals(LocalUserID, userID)
		c.Locals(LocalUserRole, role)
		return c.Next()
	}
}

func RequireSuperAdmin(db *pgxpool.Pool) fiber.Handler {
	return func(c fiber.Ctx) error {
		token := c.Cookies("auth_token")
		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "لطفاً وارد شوید"})
		}

		userID, _, err := verifyAuthToken(token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "نشست منقضی شده است. لطفاً دوباره وارد شوید"})
		}

		role, err := loadUserRole(c.Context(), db, userID)
		if err != nil {
			return err
		}
		if role != "super_admin" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"message": "دسترسی مجاز نیست"})
		}

		c.Locals(LocalUserID, userID)
		c.Locals(LocalUserRole, role)
		return c.Next()
	}
}
