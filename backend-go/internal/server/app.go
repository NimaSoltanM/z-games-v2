package server

import (
	"context"
	"os"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/healthcheck"
	"github.com/gofiber/fiber/v3/middleware/helmet"
	recoverer "github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/modules/auth"
)

func NewApp(db *pgxpool.Pool) *fiber.App {
	app := fiber.New(fiber.Config{
		ErrorHandler: errorHandler,
	})

	app.Use(recoverer.New(recoverer.Config{
		EnableStackTrace: os.Getenv("APP_ENV") != "production",
	}))
	app.Use(helmet.New())
	app.Use(compress.New(compress.Config{
		Level: compress.LevelBestSpeed,
	}))

	app.Get(healthcheck.LivenessEndpoint, healthcheck.New())
	app.Get(healthcheck.ReadinessEndpoint, healthcheck.New(healthcheck.Config{
		Probe: func(c fiber.Ctx) bool {
			return db.Ping(context.Background()) == nil
		},
	}))

	auth.RegisterRoutes(app, db)

	return app
}

func errorHandler(c fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	if code == fiber.StatusNotFound {
		return c.Status(code).JSON(fiber.Map{"message": "مسیر مورد نظر یافت نشد"})
	}
	return c.Status(code).JSON(fiber.Map{"message": "خطایی رخ داده است. لطفاً دوباره تلاش کنید"})
}
