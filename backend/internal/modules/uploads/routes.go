package uploads

import (
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/static"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/middleware"
)

const (
	// sweepInterval/sweepGrace control orphan cleanup: how often the sweep runs,
	// and how new a file must be to be spared (an upload not yet attached to a
	// game). Grace must comfortably exceed how long an admin spends on a form.
	sweepInterval = 6 * time.Hour
	sweepGrace    = 2 * time.Hour
)

// RegisterRoutes wires image upload (admin-only) and public serving, and starts
// the background orphan sweeper. The upload directory comes from UPLOAD_DIR
// (default ./uploads) and is created on startup; in production it must point at a
// persistent, backed-up volume.
func RegisterRoutes(app *fiber.App, db *pgxpool.Pool) {
	dir := Dir()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		log.Fatalf("uploads: create dir %q: %v", dir, err)
	}

	h := &handler{dir: dir, db: db}

	// Admin-only, throttled (browser-direct, so the per-IP limit is the real
	// client). Guards against a compromised admin filling the disk.
	app.Post("/uploads",
		middleware.RateLimiter(60, time.Minute),
		middleware.RequireAdmin(db),
		h.upload,
	)

	// Public read: covers are shown to everyone browsing games. Files are
	// content-unique random names, so cache them hard. CRP is set to cross-origin
	// because the frontend loads these from a different origin than the API.
	app.Get("/uploads/*", static.New(dir, static.Config{
		Browse: false,
		MaxAge: 60 * 60 * 24 * 30,
		ModifyResponse: func(c fiber.Ctx) error {
			c.Set("Cross-Origin-Resource-Policy", "cross-origin")
			return nil
		},
	}))

	// Periodically delete uploads no game references (and stale temp files).
	startSweeper(db, dir, sweepInterval, sweepGrace)
}
