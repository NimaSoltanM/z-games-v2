// Package uploads stores admin-supplied images on local disk and serves them
// back. Every upload is validated by its real magic bytes (not the client name
// or Content-Type), re-encoded to a downscaled JPEG (stripping metadata and
// capping size), and written under a random server-generated name — so a caller
// can never choose the path, smuggle a non-image, or store an oversized file.
package uploads

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

// MaxUploadBytes caps a single upload (the raw bytes received, before re-encode).
// The server's BodyLimit must be at least this large plus multipart overhead, or
// the parse fails first.
const MaxUploadBytes = 5 << 20

var (
	ErrEmpty    = errors.New("UPLOAD_EMPTY")
	ErrBadType  = errors.New("UPLOAD_BAD_TYPE")
	ErrTooLarge = errors.New("UPLOAD_TOO_LARGE")
)

// SaveImage reads the upload (bounded by MaxUploadBytes), normalizes it to a
// JPEG via processImage, and writes it atomically into dir under a random name,
// returning that name (e.g. "a1b2…f9.jpg").
func SaveImage(dir string, r io.Reader, declaredSize int64) (string, error) {
	if declaredSize <= 0 {
		return "", ErrEmpty
	}
	if declaredSize > MaxUploadBytes {
		return "", ErrTooLarge
	}

	// Read one byte past the cap so a lying size header is still caught.
	raw, err := io.ReadAll(io.LimitReader(r, MaxUploadBytes+1))
	if err != nil {
		return "", fmt.Errorf("SaveImage read: %w", err)
	}
	if int64(len(raw)) > MaxUploadBytes {
		return "", ErrTooLarge
	}

	jpegBytes, err := processImage(raw)
	if err != nil {
		return "", err
	}

	name, err := newFilename(".jpg")
	if err != nil {
		return "", fmt.Errorf("SaveImage name: %w", err)
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("SaveImage mkdir: %w", err)
	}
	if err := atomicWrite(dir, name, jpegBytes); err != nil {
		return "", err
	}
	return name, nil
}

// atomicWrite writes data to a temp file in the same directory, fsyncs it, then
// renames it into place — so a reader never sees a half-written file and a crash
// mid-write can't leave a corrupt one under the final name.
func atomicWrite(dir, name string, data []byte) error {
	tmp, err := os.CreateTemp(dir, "tmp-*")
	if err != nil {
		return fmt.Errorf("atomicWrite temp: %w", err)
	}
	tmpName := tmp.Name()
	// Removed on any error path; a no-op once the rename succeeds.
	defer os.Remove(tmpName)

	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return fmt.Errorf("atomicWrite write: %w", err)
	}
	if err := tmp.Sync(); err != nil {
		tmp.Close()
		return fmt.Errorf("atomicWrite sync: %w", err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("atomicWrite close: %w", err)
	}
	if err := os.Rename(tmpName, filepath.Join(dir, name)); err != nil {
		return fmt.Errorf("atomicWrite rename: %w", err)
	}
	return nil
}

// newFilename builds a collision-resistant random name with the given extension.
func newFilename(ext string) (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b) + ext, nil
}
