package uploads

import (
	"bytes"
	"fmt"
	"io"
	"os"
)

// MaxVideoBytes caps a single return-video upload (raw bytes received). Returns
// are filmed on a phone, so 50 MB comfortably fits a short clip while bounding
// disk and memory use. The server's BodyLimit must exceed this plus multipart
// overhead, or the parse fails before we ever see the file.
const MaxVideoBytes = 50 << 20

// ReturnDir resolves where return videos are stored (RETURN_DIR, default
// ./uploads-returns). It is deliberately a SEPARATE top-level directory from the
// image upload dir (uploads.Dir): return videos are private (streamed only to
// admins, never on the public /uploads/* mount) and must never be touched by the
// image orphan sweeper. In production it must point at a persistent, backed-up,
// non-public volume.
func ReturnDir() string {
	if d := os.Getenv("RETURN_DIR"); d != "" {
		return d
	}
	return "./uploads-returns"
}

// SaveVideo reads the upload (bounded by MaxVideoBytes), verifies it is a real
// video container by its magic bytes (not the client name or Content-Type), and
// writes it atomically into dir under a random name, returning that name (e.g.
// "a1b2…f9.mp4"). Unlike images, videos are NOT re-encoded — they are stored
// as-is for an admin to watch; the magic-byte gate plus the size cap are the
// guard, and the file is only ever served back to admins (never decoded/executed
// server-side).
func SaveVideo(dir string, r io.Reader, declaredSize int64) (string, error) {
	if declaredSize <= 0 {
		return "", ErrEmpty
	}
	if declaredSize > MaxVideoBytes {
		return "", ErrTooLarge
	}

	// Read one byte past the cap so a lying size header is still caught.
	raw, err := io.ReadAll(io.LimitReader(r, MaxVideoBytes+1))
	if err != nil {
		return "", fmt.Errorf("SaveVideo read: %w", err)
	}
	if int64(len(raw)) > MaxVideoBytes {
		return "", ErrTooLarge
	}
	if len(raw) == 0 {
		return "", ErrEmpty
	}

	ext, ok := detectVideoExt(raw)
	if !ok {
		return "", ErrBadType
	}

	name, err := newFilename(ext)
	if err != nil {
		return "", fmt.Errorf("SaveVideo name: %w", err)
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return "", fmt.Errorf("SaveVideo mkdir: %w", err)
	}
	if err := atomicWrite(dir, name, raw); err != nil {
		return "", err
	}
	return name, nil
}

// detectVideoExt classifies raw by its container magic bytes and returns the file
// extension to store it under. Accepted: MP4/M4V and QuickTime MOV (both carry an
// "ftyp" box at offset 4), and WebM/MKV (the EBML header 1A 45 DF A3). Anything
// else is rejected.
func detectVideoExt(raw []byte) (string, bool) {
	if len(raw) >= 12 && bytes.Equal(raw[4:8], []byte("ftyp")) {
		// The major brand follows the ftyp box; QuickTime uses "qt  ".
		if bytes.HasPrefix(raw[8:12], []byte("qt")) {
			return ".mov", true
		}
		return ".mp4", true
	}
	if bytes.HasPrefix(raw, []byte{0x1A, 0x45, 0xDF, 0xA3}) {
		return ".webm", true
	}
	return "", false
}
