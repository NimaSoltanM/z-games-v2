package returns

import (
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/modules/uploads"
	"github.com/soltanmohammdi/z-games/internal/shared/credentials"
	"github.com/soltanmohammdi/z-games/internal/shared/middleware"
)

// RegisterRoutes wires the user buy-back flow and the admin review queue, and
// ensures the (private, non-public) return-video directory exists. In production
// RETURN_DIR must point at a persistent, backed-up, non-web-served volume.
func RegisterRoutes(app *fiber.App, db *pgxpool.Pool) {
	cred, err := credentials.New(os.Getenv("CREDENTIALS_KEY"))
	if err != nil {
		log.Fatalf("returns credentials encryption: %v", err)
	}
	dir := uploads.ReturnDir()
	if err := os.MkdirAll(dir, 0o755); err != nil {
		log.Fatalf("returns: create dir %q: %v", dir, err)
	}

	h := &handler{db: db, cred: cred, returnDir: dir}

	// Periodically delete return videos no game_returns row references.
	startVideoSweeper(db, dir)

	auth := middleware.RequireAuth(db)
	// Video uploads are heavy (up to 50 MB) and the only reason the global
	// BodyLimit is large, so throttle them hard per IP.
	videoLimit := middleware.RateLimiter(6, time.Minute)

	app.Get("/returns/owned", auth, h.listOwned)
	app.Get("/returns/owned/:itemId", auth, h.getOwned)
	app.Get("/returns/mine", auth, h.listMine)
	app.Post("/returns", videoLimit, auth, h.create)
	app.Post("/returns/:id/resubmit", videoLimit, auth, h.resubmit)

	admin := middleware.RequireAdmin(db)
	app.Get("/admin/returns", admin, h.adminList)
	app.Get("/admin/returns/:id", admin, h.adminGet)
	app.Get("/admin/returns/:id/video", admin, h.adminVideo)
	app.Post("/admin/returns/:id/approve", admin, h.adminApprove)
	app.Post("/admin/returns/:id/reject", admin, h.adminReject)
	app.Post("/admin/returns/:id/refuse", admin, h.adminRefuse)
}
