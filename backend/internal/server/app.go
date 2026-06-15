package server

import (
	"context"
	"os"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/compress"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/healthcheck"
	"github.com/gofiber/fiber/v3/middleware/helmet"
	recoverer "github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/modules/auth"
	"github.com/soltanmohammdi/z-games/internal/modules/cart"
	"github.com/soltanmohammdi/z-games/internal/modules/games"
	"github.com/soltanmohammdi/z-games/internal/modules/orders"
)

func NewApp(db *pgxpool.Pool) *fiber.App {
	app := fiber.New(fiber.Config{
		ErrorHandler: errorHandler,
	})

	app.Use(recoverer.New(recoverer.Config{
		EnableStackTrace: os.Getenv("APP_ENV") != "production",
	}))
	app.Use(cors.New(cors.Config{
		AllowOriginsFunc: func(origin string) bool {
			if os.Getenv("APP_ENV") == "production" {
				return origin == os.Getenv("FRONTEND_URL")
			}
			return true
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		AllowCredentials: true,
		MaxAge:           3600,
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
	cart.RegisterRoutes(app, db)
	games.RegisterRoutes(app, db)
	orders.RegisterRoutes(app, db)

	return app
}

func errorHandler(c fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	msg := ""
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
		msg = e.Message
	}
	if code == fiber.StatusNotFound {
		return c.Status(code).JSON(fiber.Map{"message": "مسیر مورد نظر یافت نشد"})
	}
	if msg == "" {
		msg = "خطایی رخ داده است. لطفاً دوباره تلاش کنید"
	}
	return c.Status(code).JSON(fiber.Map{"message": msg})
}
