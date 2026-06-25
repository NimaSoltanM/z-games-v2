package uploads

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	_ "image/png" // register the PNG decoder
	"net/http"

	"golang.org/x/image/draw"
	_ "golang.org/x/image/webp" // register the WebP decoder
)

const (
	// maxOutputDim caps the long edge of the stored image. Covers render at a few
	// hundred pixels even on retina, so 1000 is ample and keeps files tiny.
	maxOutputDim = 1000
	// maxSourceDim rejects absurd inputs (decompression bombs) up front, from the
	// header alone, before we ever allocate pixels for a full decode.
	maxSourceDim = 12000
	jpegQuality  = 82
)

// ErrDimensions is returned for an image whose pixel dimensions are implausibly
// large — a cheap guard against decompression bombs.
var ErrDimensions = errors.New("UPLOAD_DIMENSIONS")

// allowedInputTypes is the set of accepted upload formats, matched against the
// real magic bytes (never the client-supplied name or Content-Type). SVG is
// intentionally excluded — it can carry script.
var allowedInputTypes = map[string]bool{
	"image/jpeg": true,
	"image/png":  true,
	"image/webp": true,
}

// processImage validates raw as an allowed image, rejects oversized dimensions,
// downscales it to fit maxOutputDim, and re-encodes to JPEG. Re-encoding strips
// all metadata (EXIF/GPS) and defeats "valid header + trailing payload" polyglots,
// since only decoded pixels survive.
func processImage(raw []byte) ([]byte, error) {
	if len(raw) == 0 {
		return nil, ErrEmpty
	}
	if !allowedInputTypes[http.DetectContentType(raw)] {
		return nil, ErrBadType
	}

	// Check dimensions from the header before decoding the whole thing.
	cfg, _, err := image.DecodeConfig(bytes.NewReader(raw))
	if err != nil {
		return nil, ErrBadType
	}
	if cfg.Width > maxSourceDim || cfg.Height > maxSourceDim {
		return nil, ErrDimensions
	}

	src, _, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		return nil, ErrBadType
	}

	dst := downscale(src, maxOutputDim)

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, dst, &jpeg.Options{Quality: jpegQuality}); err != nil {
		return nil, fmt.Errorf("processImage encode: %w", err)
	}
	return buf.Bytes(), nil
}

// downscale shrinks img so its longest edge is at most maxDim, preserving aspect
// ratio with a high-quality filter. Images already within bounds are returned
// unchanged (no needless re-sampling).
func downscale(img image.Image, maxDim int) image.Image {
	b := img.Bounds()
	w, h := b.Dx(), b.Dy()
	if w <= maxDim && h <= maxDim {
		return img
	}

	nw, nh := w, h
	if w >= h {
		nw = maxDim
		nh = h * maxDim / w
	} else {
		nh = maxDim
		nw = w * maxDim / h
	}
	if nw < 1 {
		nw = 1
	}
	if nh < 1 {
		nh = 1
	}

	dst := image.NewRGBA(image.Rect(0, 0, nw, nh))
	draw.CatmullRom.Scale(dst, dst.Bounds(), img, b, draw.Over, nil)
	return dst
}
