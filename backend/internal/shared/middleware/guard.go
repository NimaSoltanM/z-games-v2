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

// authenticate validates the auth cookie and loads the user's CURRENT role from
// the DB (so role changes or account deletion take effect immediately, not only
// when the 30-day token expires). On failure it returns a ready *fiber.Error
// (or the raw DB error for a 500); on success it returns the userID and role.
func authenticate(c fiber.Ctx, db *pgxpool.Pool) (userID, role string, err error) {
	token := c.Cookies("auth_token")
	if token == "" {
		return "", "", fiber.NewError(fiber.StatusUnauthorized, "لطفاً وارد شوید")
	}

	userID, err = verifyAuthToken(token)
	if err != nil {
		return "", "", fiber.NewError(fiber.StatusUnauthorized, "نشست منقضی شده است. لطفاً دوباره وارد شوید")
	}

	role, err = loadUserRole(c.Context(), db, userID)
	if err != nil {
		return "", "", err
	}
	if role == "" {
		return "", "", fiber.NewError(fiber.StatusUnauthorized, "نشست منقضی شده است. لطفاً دوباره وارد شوید")
	}

	return userID, role, nil
}

func RequireAuth(db *pgxpool.Pool) fiber.Handler {
	return func(c fiber.Ctx) error {
		userID, role, err := authenticate(c, db)
		if err != nil {
			return err
		}
		c.Locals(LocalUserID, userID)
		c.Locals(LocalUserRole, role)
		return c.Next()
	}
}

func RequireAdmin(db *pgxpool.Pool) fiber.Handler {
	return func(c fiber.Ctx) error {
		userID, role, err := authenticate(c, db)
		if err != nil {
			return err
		}
		if role == "user" {
			return fiber.NewError(fiber.StatusForbidden, "دسترسی مجاز نیست")
		}
		c.Locals(LocalUserID, userID)
		c.Locals(LocalUserRole, role)
		return c.Next()
	}
}

func RequireSuperAdmin(db *pgxpool.Pool) fiber.Handler {
	return func(c fiber.Ctx) error {
		userID, role, err := authenticate(c, db)
		if err != nil {
			return err
		}
		if role != "super_admin" {
			return fiber.NewError(fiber.StatusForbidden, "دسترسی مجاز نیست")
		}
		c.Locals(LocalUserID, userID)
		c.Locals(LocalUserRole, role)
		return c.Next()
	}
}
