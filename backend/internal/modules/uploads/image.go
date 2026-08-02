package uploads

import (
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	_ "image/png" // register the PNG decoder
	"log"
	"net/http"

	webpencode "github.com/gen2brain/webp"
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
	// maxSourcePixels closes the remaining decompression-bomb gap left by a
	// per-edge limit alone. Forty megapixels accommodates modern phone photos
	// while bounding the full-decode allocation.
	maxSourcePixels = 40_000_000
	jpegQuality     = 82
	webpQuality     = 82
	webpMethod      = 4
	// Prefer JPEG unless WebP saves at least 10%. This avoids changing format for
	// noise-level byte differences while retaining the meaningful bandwidth wins.
	minWebPSavingsPercent = 10
)

type processedImage struct {
	data []byte
	ext  string
}

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
// downscales it to fit maxOutputDim, and re-encodes it from decoded pixels. WebP
// is selected only when it is meaningfully smaller than JPEG. Re-encoding strips
// all metadata (EXIF/GPS) and defeats "valid header + trailing payload" polyglots.
func processImage(raw []byte) (processedImage, error) {
	if len(raw) == 0 {
		return processedImage{}, ErrEmpty
	}
	if !allowedInputTypes[http.DetectContentType(raw)] {
		return processedImage{}, ErrBadType
	}

	// Check dimensions from the header before decoding the whole thing.
	cfg, _, err := image.DecodeConfig(bytes.NewReader(raw))
	if err != nil {
		return processedImage{}, ErrBadType
	}
	if cfg.Width <= 0 || cfg.Height <= 0 ||
		cfg.Width > maxSourceDim || cfg.Height > maxSourceDim ||
		int64(cfg.Width)*int64(cfg.Height) > maxSourcePixels {
		return processedImage{}, ErrDimensions
	}

	src, _, err := image.Decode(bytes.NewReader(raw))
	if err != nil {
		return processedImage{}, ErrBadType
	}

	dst := downscale(src, maxOutputDim)

	var jpegBuf bytes.Buffer
	if err := jpeg.Encode(&jpegBuf, dst, &jpeg.Options{Quality: jpegQuality}); err != nil {
		return processedImage{}, fmt.Errorf("processImage JPEG encode: %w", err)
	}
	jpegOutput := processedImage{data: jpegBuf.Bytes(), ext: ".jpg"}

	var webpBuf bytes.Buffer
	if err := webpencode.Encode(&webpBuf, dst, webpencode.Options{
		Quality: webpQuality,
		Method:  webpMethod,
	}); err != nil {
		// Image optimization must never turn a valid upload into a failed upload.
		// JPEG is already safely encoded, so keep it and surface the optimization
		// failure to operators.
		log.Printf("uploads: WebP encode failed; using JPEG: %v", err)
		return jpegOutput, nil
	}

	return chooseProcessedImage(jpegOutput, processedImage{
		data: webpBuf.Bytes(),
		ext:  ".webp",
	}), nil
}

func chooseProcessedImage(jpegOutput, webpOutput processedImage) processedImage {
	if len(webpOutput.data)*100 <= len(jpegOutput.data)*(100-minWebPSavingsPercent) {
		return webpOutput
	}
	return jpegOutput
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
