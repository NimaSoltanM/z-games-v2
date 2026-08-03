package uploads

import (
	"errors"
	"fmt"
	"log"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/audit"
	"github.com/soltanmohammdi/z-games/internal/shared/middleware"
)

type handler struct {
	dir string
	db  *pgxpool.Pool
}

// upload accepts a single multipart image under the form field "file", stores a
// normalized copy, and returns its public path. Validation/normalization lives
// in SaveImage; this maps the outcome to a user-facing Persian response.
func (h *handler) upload(c fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "تصویری ارسال نشده است"})
	}
	if fileHeader.Size > MaxUploadBytes {
		return c.Status(fiber.StatusRequestEntityTooLarge).JSON(fiber.Map{
			"message": "حجم تصویر بیش از حد مجاز است (حداکثر ۵ مگابایت)",
		})
	}

	f, err := fileHeader.Open()
	if err != nil {
		return fmt.Errorf("upload open: %w", err)
	}
	defer f.Close()

	name, err := SaveImage(h.dir, f, fileHeader.Size)
	switch {
	case errors.Is(err, ErrEmpty):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "فایل تصویر خالی است"})
	case errors.Is(err, ErrBadType):
		return c.Status(fiber.StatusUnsupportedMediaType).JSON(fiber.Map{
			"message": "فقط فایل تصویری (JPEG، PNG، WebP یا AVIF) مجاز است",
		})
	case errors.Is(err, ErrDimensions):
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"message": "ابعاد تصویر بیش از حد مجاز است",
		})
	case errors.Is(err, ErrTooSmall):
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"message": "وضوح تصویر کافی نیست (حداقل ۶۰۰×۸۰۰ پیکسل)",
		})
	case errors.Is(err, ErrTooLarge):
		return c.Status(fiber.StatusRequestEntityTooLarge).JSON(fiber.Map{
			"message": "حجم تصویر بیش از حد مجاز است (حداکثر ۵ مگابایت)",
		})
	case err != nil:
		return fmt.Errorf("upload save: %w", err)
	}

	// Audit the upload, attributed to the admin. A logging failure must not fail
	// the upload — the file is already safely stored.
	if h.db != nil {
		if adminID, ok := c.Locals(middleware.LocalUserID).(string); ok && adminID != "" {
			if err := audit.Record(c.Context(), h.db, audit.Entry{
				AdminID:    adminID,
				Action:     audit.ActionImageUpload,
				TargetType: "image",
				TargetID:   name,
				Metadata:   map[string]any{"original_size": fileHeader.Size},
			}); err != nil {
				log.Printf("uploads: audit record failed for %s: %v", name, err)
			}
		}
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"url": "/uploads/" + name})
}
