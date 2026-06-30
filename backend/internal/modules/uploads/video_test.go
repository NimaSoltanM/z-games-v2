package uploads

import (
	"bytes"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// pad appends n zero bytes so a header is long enough for detection.
func pad(header []byte, n int) []byte {
	return append(header, make([]byte, n)...)
}

func TestDetectVideoExt(t *testing.T) {
	cases := []struct {
		name string
		data []byte
		ext  string
		ok   bool
	}{
		{"mp4 isom", pad([]byte("\x00\x00\x00\x18ftypisom"), 16), ".mp4", true},
		{"mp4 mp42", pad([]byte("\x00\x00\x00\x18ftypmp42"), 16), ".mp4", true},
		{"mov quicktime", pad([]byte("\x00\x00\x00\x18ftypqt  "), 16), ".mov", true},
		{"webm/mkv ebml", pad([]byte{0x1A, 0x45, 0xDF, 0xA3}, 16), ".webm", true},
		{"garbage", []byte("this is definitely not a video file"), "", false},
		{"ftyp too short", []byte("\x00\x00\x00\x18ftyp"), "", false}, // < 12 bytes
		{"empty", nil, "", false},
		{"jpeg header", []byte{0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0}, "", false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			ext, ok := detectVideoExt(c.data)
			if ok != c.ok || ext != c.ext {
				t.Fatalf("detectVideoExt = (%q, %v), want (%q, %v)", ext, ok, c.ext, c.ok)
			}
		})
	}
}

func TestSaveVideo(t *testing.T) {
	dir := t.TempDir()
	good := pad([]byte("\x00\x00\x00\x18ftypisom"), 100)

	// A valid clip is stored under a random .mp4 name and the file exists.
	name, err := SaveVideo(dir, bytes.NewReader(good), int64(len(good)))
	if err != nil {
		t.Fatalf("SaveVideo: %v", err)
	}
	if !strings.HasSuffix(name, ".mp4") {
		t.Fatalf("name = %q, want a .mp4 suffix", name)
	}
	saved, err := os.ReadFile(filepath.Join(dir, name))
	if err != nil {
		t.Fatalf("read back: %v", err)
	}
	if !bytes.Equal(saved, good) {
		t.Fatal("stored bytes differ from input (video must be stored as-is)")
	}
}

func TestSaveVideo_Rejects(t *testing.T) {
	dir := t.TempDir()
	good := pad([]byte("\x00\x00\x00\x18ftypisom"), 100)

	if _, err := SaveVideo(dir, bytes.NewReader(nil), 0); !errors.Is(err, ErrEmpty) {
		t.Fatalf("empty: err = %v, want ErrEmpty", err)
	}
	// A declared size over the cap is rejected before reading.
	if _, err := SaveVideo(dir, bytes.NewReader(good), MaxVideoBytes+1); !errors.Is(err, ErrTooLarge) {
		t.Fatalf("oversize declared: err = %v, want ErrTooLarge", err)
	}
	// A non-video payload is rejected by magic bytes, not by name/Content-Type.
	bad := []byte("plain text masquerading as a clip, no container signature")
	if _, err := SaveVideo(dir, bytes.NewReader(bad), int64(len(bad))); !errors.Is(err, ErrBadType) {
		t.Fatalf("bad type: err = %v, want ErrBadType", err)
	}
	// Nothing should have been written for the rejected uploads.
	entries, _ := os.ReadDir(dir)
	if len(entries) != 0 {
		t.Fatalf("dir has %d file(s), want 0 after rejections", len(entries))
	}
}
