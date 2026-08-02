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

func decodeImageInfo(t *testing.T, data []byte) (int, int, string) {
	t.Helper()
	cfg, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		t.Fatalf("decode config: %v", err)
	}
	return cfg.Width, cfg.Height, format
}

func jpegHeaderWithDimensions(t *testing.T, w, h int) []byte {
	t.Helper()
	raw := makeJPEG(t, 8, 8)
	for i := 0; i+8 < len(raw); i++ {
		// SOF0 stores the decoded height and width as big-endian uint16 values.
		if raw[i] == 0xff && raw[i+1] == 0xc0 {
			raw[i+5] = byte(h >> 8)
			raw[i+6] = byte(h)
			raw[i+7] = byte(w >> 8)
			raw[i+8] = byte(w)
			return raw
		}
	}
	t.Fatal("JPEG fixture has no SOF0 marker")
	return nil
}

func mustExec(t *testing.T, db *pgxpool.Pool, sql string, args ...any) {
	t.Helper()
	if _, err := db.Exec(context.Background(), sql, args...); err != nil {
		t.Fatalf("exec failed: %v\nSQL: %s", err, sql)
	}
}

// --- processImage -----------------------------------------------------------

func TestProcessImage_UsesWebPWhenMeaningfullySmaller(t *testing.T) {
	out, err := processImage(makePNG(t, 200, 300))
	if err != nil {
		t.Fatal(err)
	}
	if out.ext != ".webp" {
		t.Fatalf("output extension = %q, want .webp", out.ext)
	}
	if ct := http.DetectContentType(out.data); ct != "image/webp" {
		t.Fatalf("output type = %q, want image/webp", ct)
	}
	if w, h, _ := decodeImageInfo(t, out.data); w != 200 || h != 300 {
		t.Fatalf("small image got resized to %dx%d, want 200x300", w, h)
	}
}

func TestProcessImage_Downscales(t *testing.T) {
	out, err := processImage(makeJPEG(t, 2000, 1500))
	if err != nil {
		t.Fatal(err)
	}
	// Long edge capped at maxOutputDim, aspect preserved (2000x1500 → 1000x750).
	if w, h, _ := decodeImageInfo(t, out.data); w != maxOutputDim || h != 750 {
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
	if ct := http.DetectContentType(out.data); ct != "image/jpeg" && ct != "image/webp" {
		t.Fatalf("unexpected output type = %q", ct)
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
	// Reject excessive total pixels even when both individual edges are allowed.
	if _, err := processImage(jpegHeaderWithDimensions(t, 8000, 6000)); !errors.Is(err, ErrDimensions) {
		t.Fatalf("huge pixel count: got %v, want ErrDimensions", err)
	}
}

func TestChooseProcessedImage_RequiresMeaningfulWebPSavings(t *testing.T) {
	jpegOutput := processedImage{data: make([]byte, 1000), ext: ".jpg"}

	tooClose := processedImage{data: make([]byte, 901), ext: ".webp"}
	if got := chooseProcessedImage(jpegOutput, tooClose); got.ext != ".jpg" {
		t.Fatalf("9.9%% savings selected %q, want JPEG", got.ext)
	}

	meaningful := processedImage{data: make([]byte, 900), ext: ".webp"}
	if got := chooseProcessedImage(jpegOutput, meaningful); got.ext != ".webp" {
		t.Fatalf("10%% savings selected %q, want WebP", got.ext)
	}
}

// --- SaveImage --------------------------------------------------------------

func TestSaveImage_WritesNormalizedImage(t *testing.T) {
	dir := tempDir(t)
	raw := makePNG(t, 400, 600)
	name, err := SaveImage(dir, bytes.NewReader(raw), int64(len(raw)))
	if err != nil {
		t.Fatal(err)
	}
	if ext := filepath.Ext(name); ext != ".jpg" && ext != ".webp" {
		t.Fatalf("name = %q, want .jpg or .webp", name)
	}
	stored, err := os.ReadFile(filepath.Join(dir, name))
	if err != nil {
		t.Fatal(err)
	}
	ct := http.DetectContentType(stored)
	wantType := "image/jpeg"
	if filepath.Ext(name) == ".webp" {
		wantType = "image/webp"
	}
	if ct != wantType {
		t.Fatalf("stored type = %q, want %q for %s", ct, wantType, name)
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
	resp, err := app.Test(req, fiber.TestConfig{
		Timeout:       10 * time.Second,
		FailOnTimeout: true,
	})
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
	if !strings.HasPrefix(out.URL, "/uploads/") || !strings.HasSuffix(out.URL, ".webp") {
		t.Fatalf("url = %q, want optimized /uploads/*.webp", out.URL)
	}

	getResp, err := app.Test(httptest.NewRequest(http.MethodGet, out.URL, nil))
	if err != nil {
		t.Fatal(err)
	}
	if getResp.StatusCode != fiber.StatusOK {
		t.Fatalf("serve status = %d, want 200", getResp.StatusCode)
	}
	served, _ := io.ReadAll(getResp.Body)
	w, h, format := decodeImageInfo(t, served)
	if w != 300 || h != 400 {
		t.Fatalf("served image is %dx%d, want 300x400", w, h)
	}
	wantContentType := "image/" + format
	if ct := getResp.Header.Get("Content-Type"); !strings.HasPrefix(ct, wantContentType) {
		t.Fatalf("served Content-Type = %q, want %s", ct, wantContentType)
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
		"INSERT INTO games (id, name, slug, cover_image) VALUES ('g1', 'G', 'g1', '/uploads/referenced.jpg')")

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
