package uploads

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/static"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/middleware"
	"github.com/soltanmohammdi/z-games/internal/testdb"
)

// --- helpers ----------------------------------------------------------------

// tempDir is a temp directory with best-effort cleanup. Unlike t.TempDir(), it
// doesn't fail the test if a file can't be removed — on Windows the static
// middleware can still hold a served file open when the test ends.
func tempDir(t *testing.T) string {
	t.Helper()
	d, err := os.MkdirTemp("", "uploads-test-")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = os.RemoveAll(d) })
	return d
}

func solidImage(w, h int) *image.RGBA {
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := range h {
		for x := range w {
			img.Set(x, y, color.RGBA{uint8(x % 256), uint8(y % 256), 120, 255})
		}
	}
	return img
}

func makeJPEG(t *testing.T, w, h int) []byte {
	t.Helper()
	var b bytes.Buffer
	if err := jpeg.Encode(&b, solidImage(w, h), &jpeg.Options{Quality: 90}); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}

func makePNG(t *testing.T, w, h int) []byte {
	t.Helper()
	var b bytes.Buffer
	if err := png.Encode(&b, solidImage(w, h)); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}

func decodeDims(t *testing.T, data []byte) (int, int) {
	t.Helper()
	cfg, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("decode config: %v", err)
	}
	if format != "jpeg" {
		t.Fatalf("output format = %q, want jpeg", format)
	}
	return cfg.Width, cfg.Height
}

func mustExec(t *testing.T, db *pgxpool.Pool, sql string, args ...any) {
	t.Helper()
	if _, err := db.Exec(context.Background(), sql, args...); err != nil {
		t.Fatalf("exec failed: %v\nSQL: %s", err, sql)
	}
}

// --- processImage -----------------------------------------------------------

func TestProcessImage_ReencodesToJPEG(t *testing.T) {
	out, err := processImage(makePNG(t, 200, 300))
	if err != nil {
		t.Fatal(err)
	}
	if ct := http.DetectContentType(out); ct != "image/jpeg" {
		t.Fatalf("output type = %q, want image/jpeg (input was PNG)", ct)
	}
	if w, h := decodeDims(t, out); w != 200 || h != 300 {
		t.Fatalf("small image got resized to %dx%d, want 200x300", w, h)
	}
}

func TestProcessImage_Downscales(t *testing.T) {
	out, err := processImage(makeJPEG(t, 2000, 1500))
	if err != nil {
		t.Fatal(err)
	}
	// Long edge capped at maxOutputDim, aspect preserved (2000x1500 → 1000x750).
	if w, h := decodeDims(t, out); w != maxOutputDim || h != 750 {
		t.Fatalf("downscaled to %dx%d, want %dx750", w, h, maxOutputDim)
	}
}

func TestProcessImage_AcceptsWebP(t *testing.T) {
	raw, err := os.ReadFile(filepath.Join("testdata", "sample.webp"))
	if err != nil {
		t.Fatalf("read fixture: %v", err)
	}
	out, err := processImage(raw)
	if err != nil {
		t.Fatalf("webp rejected: %v", err)
	}
	if ct := http.DetectContentType(out); ct != "image/jpeg" {
		t.Fatalf("webp not converted, output type = %q", ct)
	}
}

func TestProcessImage_Rejects(t *testing.T) {
	if _, err := processImage([]byte("this is just text, not an image")); !errors.Is(err, ErrBadType) {
		t.Fatalf("text: got %v, want ErrBadType", err)
	}
	if _, err := processImage(nil); !errors.Is(err, ErrEmpty) {
		t.Fatalf("empty: got %v, want ErrEmpty", err)
	}
	// A header claiming implausible dimensions is rejected before a full decode.
	if _, err := processImage(makeJPEG(t, maxSourceDim+1, 8)); !errors.Is(err, ErrDimensions) {
		t.Fatalf("huge dims: got %v, want ErrDimensions", err)
	}
}

// --- SaveImage --------------------------------------------------------------

func TestSaveImage_WritesNormalizedJPEG(t *testing.T) {
	dir := tempDir(t)
	name, err := SaveImage(dir, bytes.NewReader(makePNG(t, 400, 600)), int64(len(makePNG(t, 400, 600))))
	if err != nil {
		t.Fatal(err)
	}
	if filepath.Ext(name) != ".jpg" {
		t.Fatalf("name = %q, want .jpg", name)
	}
	stored, err := os.ReadFile(filepath.Join(dir, name))
	if err != nil {
		t.Fatal(err)
	}
	if ct := http.DetectContentType(stored); ct != "image/jpeg" {
		t.Fatalf("stored type = %q, want image/jpeg", ct)
	}
	// No leftover temp files from the atomic write.
	entries, _ := os.ReadDir(dir)
	for _, e := range entries {
		if strings.HasPrefix(e.Name(), "tmp-") {
			t.Fatalf("temp file left behind: %s", e.Name())
		}
	}
}

func TestSaveImage_RejectsSizeBounds(t *testing.T) {
	dir := tempDir(t)
	if _, err := SaveImage(dir, bytes.NewReader(nil), 0); !errors.Is(err, ErrEmpty) {
		t.Fatalf("zero size: got %v, want ErrEmpty", err)
	}
	if _, err := SaveImage(dir, bytes.NewReader(makeJPEG(t, 10, 10)), MaxUploadBytes+1); !errors.Is(err, ErrTooLarge) {
		t.Fatalf("oversize: got %v, want ErrTooLarge", err)
	}
	entries, _ := os.ReadDir(dir)
	if len(entries) != 0 {
		t.Fatalf("rejected uploads left %d file(s)", len(entries))
	}
}

func TestSaveImage_UniqueNames(t *testing.T) {
	dir := tempDir(t)
	jpg := makeJPEG(t, 50, 50)
	a, err := SaveImage(dir, bytes.NewReader(jpg), int64(len(jpg)))
	if err != nil {
		t.Fatal(err)
	}
	b, err := SaveImage(dir, bytes.NewReader(jpg), int64(len(jpg)))
	if err != nil {
		t.Fatal(err)
	}
	if a == b {
		t.Fatalf("expected distinct names, both were %q", a)
	}
}

// --- HTTP round trip --------------------------------------------------------

func testApp(dir string, db *pgxpool.Pool) *fiber.App {
	app := fiber.New()
	h := &handler{dir: dir, db: db}
	app.Post("/uploads", h.upload)
	app.Get("/uploads/*", static.New(dir, static.Config{
		MaxAge: 60 * 60 * 24 * 30,
		// Disable the inactive-handler cache so the test's temp dir can be deleted
		// on Windows (a cached handler keeps the file open). Production uses the
		// default cache; files are unique and never overwritten, so it's safe there.
		CacheDuration: -1,
		ModifyResponse: func(c fiber.Ctx) error {
			c.Set("Cross-Origin-Resource-Policy", "cross-origin")
			return nil
		},
	}))
	return app
}

func multipartImage(t *testing.T, field, filename string, data []byte) (*bytes.Buffer, string) {
	t.Helper()
	body := &bytes.Buffer{}
	w := multipart.NewWriter(body)
	fw, err := w.CreateFormFile(field, filename)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := fw.Write(data); err != nil {
		t.Fatal(err)
	}
	if err := w.Close(); err != nil {
		t.Fatal(err)
	}
	return body, w.FormDataContentType()
}

func TestUploadAndServe_RoundTrip(t *testing.T) {
	dir := tempDir(t)
	app := testApp(dir, nil)

	body, contentType := multipartImage(t, "file", "cover.png", makePNG(t, 300, 400))
	req := httptest.NewRequest(http.MethodPost, "/uploads", body)
	req.Header.Set("Content-Type", contentType)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusCreated {
		t.Fatalf("upload status = %d, want 201", resp.StatusCode)
	}
	var out struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatal(err)
	}
	// Stored as a normalized JPEG regardless of the uploaded PNG.
	if !strings.HasPrefix(out.URL, "/uploads/") || !strings.HasSuffix(out.URL, ".jpg") {
		t.Fatalf("url = %q, want /uploads/*.jpg", out.URL)
	}

	getResp, err := app.Test(httptest.NewRequest(http.MethodGet, out.URL, nil))
	if err != nil {
		t.Fatal(err)
	}
	if getResp.StatusCode != fiber.StatusOK {
		t.Fatalf("serve status = %d, want 200", getResp.StatusCode)
	}
	served, _ := io.ReadAll(getResp.Body)
	if w, h := decodeDims(t, served); w != 300 || h != 400 {
		t.Fatalf("served image is %dx%d, want 300x400", w, h)
	}
	if ct := getResp.Header.Get("Content-Type"); !strings.HasPrefix(ct, "image/jpeg") {
		t.Fatalf("served Content-Type = %q, want image/jpeg", ct)
	}
	if crp := getResp.Header.Get("Cross-Origin-Resource-Policy"); crp != "cross-origin" {
		t.Fatalf("CRP header = %q, want cross-origin", crp)
	}
}

func TestUpload_RejectsNonImage(t *testing.T) {
	dir := tempDir(t)
	app := testApp(dir, nil)

	body, contentType := multipartImage(t, "file", "evil.png", []byte("definitely not an image, just text pretending"))
	req := httptest.NewRequest(http.MethodPost, "/uploads", body)
	req.Header.Set("Content-Type", contentType)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusUnsupportedMediaType {
		t.Fatalf("status = %d, want 415", resp.StatusCode)
	}
}

func TestUpload_MissingFile(t *testing.T) {
	dir := tempDir(t)
	app := testApp(dir, nil)

	resp, err := app.Test(httptest.NewRequest(http.MethodPost, "/uploads", nil))
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("status = %d, want 400", resp.StatusCode)
	}
}

func TestServe_PathTraversalIsContained(t *testing.T) {
	base := tempDir(t)
	dir := filepath.Join(base, "uploads")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	secret := filepath.Join(base, "secret.txt")
	if err := os.WriteFile(secret, []byte("top secret"), 0o600); err != nil {
		t.Fatal(err)
	}
	app := testApp(dir, nil)

	for _, p := range []string{"/uploads/../secret.txt", "/uploads/%2e%2e/secret.txt"} {
		resp, err := app.Test(httptest.NewRequest(http.MethodGet, p, nil))
		if err != nil {
			t.Fatal(err)
		}
		served, _ := io.ReadAll(resp.Body)
		if resp.StatusCode == fiber.StatusOK && bytes.Contains(served, []byte("top secret")) {
			t.Fatalf("path %q escaped the uploads dir", p)
		}
	}
}

// --- audit + orphan sweep (DB-backed) ---------------------------------------

func TestUpload_Audited(t *testing.T) {
	db := testdb.New(t)
	mustExec(t, db, "INSERT INTO users (id, phone, role) VALUES ('admin1', '09120000001', 'admin')")
	dir := tempDir(t)

	app := fiber.New()
	h := &handler{dir: dir, db: db}
	// Stand in for RequireAdmin: set the admin id the handler audits under.
	app.Post("/uploads", func(c fiber.Ctx) error {
		c.Locals(middleware.LocalUserID, "admin1")
		return c.Next()
	}, h.upload)

	body, contentType := multipartImage(t, "file", "cover.jpg", makeJPEG(t, 100, 100))
	req := httptest.NewRequest(http.MethodPost, "/uploads", body)
	req.Header.Set("Content-Type", contentType)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatal(err)
	}
	if resp.StatusCode != fiber.StatusCreated {
		t.Fatalf("status = %d, want 201", resp.StatusCode)
	}

	var n int
	if err := db.QueryRow(context.Background(),
		"SELECT COUNT(*) FROM admin_actions WHERE action = 'image.upload' AND admin_id = 'admin1'",
	).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Fatalf("audit rows = %d, want 1", n)
	}
}

func TestSweepOrphans(t *testing.T) {
	db := testdb.New(t)
	dir := tempDir(t)
	old := time.Now().Add(-3 * time.Hour)

	write := func(name string, mod time.Time) {
		p := filepath.Join(dir, name)
		if err := os.WriteFile(p, []byte("x"), 0o600); err != nil {
			t.Fatal(err)
		}
		if err := os.Chtimes(p, mod, mod); err != nil {
			t.Fatal(err)
		}
	}

	write("referenced.jpg", old)        // old but in use → kept
	write("orphan_old.jpg", old)        // old and unused → removed
	write("orphan_new.jpg", time.Now()) // unused but fresh → spared by grace

	mustExec(t, db,
		"INSERT INTO games (id, name, platform, cover_image) VALUES ('g1', 'G', 'ps5', '/uploads/referenced.jpg')")

	removed, err := SweepOrphans(context.Background(), db, dir, 2*time.Hour)
	if err != nil {
		t.Fatal(err)
	}
	if removed != 1 {
		t.Fatalf("removed = %d, want 1", removed)
	}

	exists := func(name string) bool {
		_, err := os.Stat(filepath.Join(dir, name))
		return err == nil
	}
	if !exists("referenced.jpg") {
		t.Fatal("referenced file was wrongly removed")
	}
	if exists("orphan_old.jpg") {
		t.Fatal("old orphan was not removed")
	}
	if !exists("orphan_new.jpg") {
		t.Fatal("fresh orphan was removed despite the grace window")
	}
}

func TestDeleteImageByURL(t *testing.T) {
	dir := tempDir(t)
	p := filepath.Join(dir, "x.jpg")
	if err := os.WriteFile(p, []byte("x"), 0o600); err != nil {
		t.Fatal(err)
	}

	if err := DeleteImageByURL(dir, "/uploads/x.jpg"); err != nil {
		t.Fatal(err)
	}
	if _, err := os.Stat(p); !os.IsNotExist(err) {
		t.Fatal("file should have been deleted")
	}
	// Already gone → no error.
	if err := DeleteImageByURL(dir, "/uploads/x.jpg"); err != nil {
		t.Fatalf("deleting a missing file should be a no-op, got %v", err)
	}
	// External/absolute URLs aren't ours → no error, no-op.
	if err := DeleteImageByURL(dir, "https://example.com/y.jpg"); err != nil {
		t.Fatalf("external url should be a no-op, got %v", err)
	}
}
