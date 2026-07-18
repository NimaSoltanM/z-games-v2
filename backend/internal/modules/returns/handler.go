package returns

import (
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/modules/uploads"
	"github.com/soltanmohammdi/z-games/internal/shared/credentials"
	"github.com/soltanmohammdi/z-games/internal/shared/middleware"
)

type handler struct {
	db        *pgxpool.Pool
	cred      *credentials.Cipher
	returnDir string
}

// --- user -------------------------------------------------------------------

func (h *handler) listOwned(c fiber.Ctx) error {
	userID := c.Locals(middleware.LocalUserID).(string)
	page, limit, offset := pageParams(c)
	items, total, err := listOwned(c.Context(), h.db, userID, limit, offset)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"items": items, "pagination": pagination(page, limit, total)})
}

// create opens a return request for a delivered account: validates the account is
// returnable, stores the uploaded video, then inserts the pending request. The
// video is saved before the row, so a failed insert (e.g. a concurrent duplicate)
// cleans the orphaned file up.
func (h *handler) create(c fiber.Ctx) error {
	userID := c.Locals(middleware.LocalUserID).(string)
	itemID := strings.TrimSpace(c.FormValue("order_item_id"))
	if itemID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "حساب موردنظر مشخص نشده است"})
	}
	if c.FormValue("agreed_terms") != "true" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "برای ثبت درخواست باید قوانین و شرایط بازگشت را بپذیرید",
		})
	}

	if err := canCreateReturn(c.Context(), h.db, userID, itemID); err != nil {
		if resp := mapCreateError(c, err); resp != nil {
			return resp
		}
		return err
	}

	name, resp := h.saveVideo(c)
	if resp != nil {
		return resp
	}

	id, err := insertReturn(c.Context(), h.db, userID, itemID, name)
	if err != nil {
		h.removeVideo(name) // don't leave an orphaned upload behind
		if errors.Is(err, ErrAlreadyRequested) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"message": "برای این حساب قبلاً درخواست بازگشت ثبت شده است"})
		}
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"id": id})
}

// resubmit replaces the video on a rejected request and reopens it for review.
func (h *handler) resubmit(c fiber.Ctx) error {
	userID := c.Locals(middleware.LocalUserID).(string)
	id := c.Params("id")
	if c.FormValue("agreed_terms") != "true" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"message": "برای ثبت مجدد باید قوانین و شرایط بازگشت را بپذیرید",
		})
	}

	oldVideo, err := getResubmittable(c.Context(), h.db, userID, id)
	switch {
	case errors.Is(err, ErrReturnNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "درخواست موردنظر یافت نشد"})
	case errors.Is(err, ErrNotResubmittable):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "این درخواست قابل ویرایش نیست"})
	case err != nil:
		return err
	}

	name, resp := h.saveVideo(c)
	if resp != nil {
		return resp
	}

	if err := resubmitReturn(c.Context(), h.db, userID, id, name); err != nil {
		h.removeVideo(name)
		if errors.Is(err, ErrNotResubmittable) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "این درخواست قابل ویرایش نیست"})
		}
		return err
	}
	if oldVideo != "" {
		h.removeVideo(oldVideo) // best-effort: drop the replaced clip
	}
	return c.JSON(fiber.Map{"id": id})
}

// getOwned returns a single owned account by its order_item id (404 if not the
// user's / not delivered).
func (h *handler) getOwned(c fiber.Ctx) error {
	userID := c.Locals(middleware.LocalUserID).(string)
	it, err := getOwnedItem(c.Context(), h.db, userID, c.Params("itemId"))
	if err != nil {
		return err
	}
	if it == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "حساب موردنظر یافت نشد"})
	}
	return c.JSON(it)
}

func (h *handler) listMine(c fiber.Ctx) error {
	userID := c.Locals(middleware.LocalUserID).(string)
	page, limit, offset := pageParams(c)
	items, total, err := listMyReturns(c.Context(), h.db, userID, limit, offset)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"returns": items, "pagination": pagination(page, limit, total)})
}

// --- admin ------------------------------------------------------------------

func (h *handler) adminList(c fiber.Ctx) error {
	page, limit, offset := pageParams(c)
	rows, total, err := listAdminReturns(c.Context(), h.db, adminFilter{
		status: c.Query("status"),
		search: strings.TrimSpace(c.Query("search")),
		limit:  limit,
		offset: offset,
	})
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"returns": rows, "pagination": pagination(page, limit, total)})
}

func (h *handler) adminGet(c fiber.Ctx) error {
	d, err := getAdminReturn(c.Context(), h.db, h.cred, c.Params("id"))
	if err != nil {
		return err
	}
	if d == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "درخواست موردنظر یافت نشد"})
	}
	return c.JSON(d)
}

func (h *handler) adminListReturnedAccounts(c fiber.Ctx) error {
	page, limit, offset := pageParams(c)
	rows, total, err := listReturnedAccounts(c.Context(), h.db, h.cred, returnedAccountFilter{
		status: c.Query("status"),
		search: strings.TrimSpace(c.Query("search")),
		limit:  limit,
		offset: offset,
	})
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"accounts": rows, "pagination": pagination(page, limit, total)})
}

func (h *handler) adminSetReturnedAccountAvailability(c fiber.Ctx) error {
	adminID := c.Locals(middleware.LocalUserID).(string)
	var body struct {
		Available *bool `json:"available"`
	}
	if err := c.Bind().JSON(&body); err != nil || body.Available == nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}

	err := setReturnedAccountAvailability(c.Context(), h.db, h.cred, adminID, c.Params("id"), *body.Available)
	switch {
	case errors.Is(err, ErrReturnNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "حساب بازگردانده‌شده یافت نشد"})
	case errors.Is(err, ErrInventoryUnavailable):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "این حساب در فهرست موجودی قابل مدیریت نیست"})
	case errors.Is(err, ErrInventoryReused):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"message": "این حساب قبلاً برای یک سفارش دیگر استفاده شده و سابقهٔ آن قابل بازگردانی نیست"})
	case errors.Is(err, ErrInventoryActive):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"message": "این حساب اکنون در اختیار یک مشتری است و نمی‌توان آن را دوباره موجود کرد"})
	case err != nil:
		return err
	}
	return c.JSON(fiber.Map{"available": *body.Available})
}

// adminVideo streams a return's video to an admin. Videos are private (never on
// the public uploads mount); only this admin-guarded route serves them.
func (h *handler) adminVideo(c fiber.Ctx) error {
	name, err := videoFilename(c.Context(), h.db, c.Params("id"))
	if errors.Is(err, ErrReturnNotFound) || (err == nil && name == "") {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "ویدیویی یافت نشد"})
	}
	if err != nil {
		return err
	}
	// name is a server-generated random filename; Base() defends against any
	// traversal regardless. Disable compression — video is already compressed and
	// SendFile honors range requests so the admin can scrub. CacheDuration -1 keeps
	// large clips out of fasthttp's FS cache. (On Linux the on-approval delete
	// unlinks fine even while a stream holds the file; on Windows the handle lingers
	// briefly, so the orphan sweeper is the cleanup backstop there.)
	path := filepath.Join(h.returnDir, filepath.Base(name))
	return c.SendFile(path, fiber.SendFile{Compress: false, CacheDuration: -1})
}

func (h *handler) adminApprove(c fiber.Ctx) error {
	adminID := c.Locals(middleware.LocalUserID).(string)
	var body struct {
		CreditAmount int `json:"credit_amount"`
	}
	if err := c.Bind().JSON(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}

	oldVideo, err := approveReturn(c.Context(), h.db, adminID, c.Params("id"), body.CreditAmount)
	switch {
	case errors.Is(err, ErrInvalidCredit):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "مبلغ اعتبار باید بزرگ‌تر از صفر باشد"})
	case errors.Is(err, ErrCreditTooLarge):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "مبلغ اعتبار بیش از حد مجاز است (نمی‌تواند از قیمت فعلی بازی بیشتر باشد)"})
	case errors.Is(err, ErrReturnNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "درخواست موردنظر یافت نشد"})
	case errors.Is(err, ErrNotReviewable):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "این درخواست در وضعیت قابل بررسی نیست"})
	case err != nil:
		return err
	}
	// The deal is settled — drop the proof video from disk (its row reference was
	// already cleared in the transaction). Best-effort: a failure here is harmless,
	// the orphan sweeper would catch it later anyway.
	h.removeVideo(oldVideo)
	return h.adminGet(c)
}

func (h *handler) adminReject(c fiber.Ctx) error { return h.review(c, false) }
func (h *handler) adminRefuse(c fiber.Ctx) error { return h.review(c, true) }

func (h *handler) review(c fiber.Ctx, terminal bool) error {
	adminID := c.Locals(middleware.LocalUserID).(string)
	var body struct {
		Reason string `json:"reason"`
	}
	if err := c.Bind().JSON(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}

	err := reviewReturn(c.Context(), h.db, adminID, c.Params("id"), body.Reason, terminal)
	switch {
	case errors.Is(err, ErrReasonRequired):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "ذکر دلیل الزامی است"})
	case errors.Is(err, ErrReturnNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "درخواست موردنظر یافت نشد"})
	case errors.Is(err, ErrNotReviewable):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "این درخواست در وضعیت قابل بررسی نیست"})
	case err != nil:
		return err
	}
	return h.adminGet(c)
}

// --- helpers ----------------------------------------------------------------

// saveVideo reads the "video" multipart file and stores it, returning the saved
// filename. On any problem it returns a ready Persian error response (the caller
// returns it directly) and an empty name.
func (h *handler) saveVideo(c fiber.Ctx) (string, error) {
	fh, err := c.FormFile("video")
	if err != nil {
		return "", c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "ویدیو ارسال نشده است"})
	}
	if fh.Size > uploads.MaxVideoBytes {
		return "", c.Status(fiber.StatusRequestEntityTooLarge).JSON(fiber.Map{
			"message": "حجم ویدیو بیش از حد مجاز است (حداکثر ۵۰ مگابایت)",
		})
	}
	f, err := fh.Open()
	if err != nil {
		return "", fmt.Errorf("saveVideo open: %w", err)
	}
	defer f.Close()

	name, err := uploads.SaveVideo(h.returnDir, f, fh.Size)
	switch {
	case errors.Is(err, uploads.ErrEmpty):
		return "", c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "فایل ویدیو خالی است"})
	case errors.Is(err, uploads.ErrBadType):
		return "", c.Status(fiber.StatusUnsupportedMediaType).JSON(fiber.Map{
			"message": "فقط فایل ویدیویی (MP4، MOV یا WebM) مجاز است",
		})
	case errors.Is(err, uploads.ErrTooLarge):
		return "", c.Status(fiber.StatusRequestEntityTooLarge).JSON(fiber.Map{
			"message": "حجم ویدیو بیش از حد مجاز است (حداکثر ۵۰ مگابایت)",
		})
	case err != nil:
		return "", fmt.Errorf("saveVideo: %w", err)
	}
	return name, nil
}

// removeVideo deletes a stored return video by name (best-effort).
func (h *handler) removeVideo(name string) {
	if name == "" {
		return
	}
	if err := os.Remove(filepath.Join(h.returnDir, filepath.Base(name))); err != nil && !os.IsNotExist(err) {
		log.Printf("returns: video cleanup failed for %s: %v", name, err)
	}
}

// mapCreateError turns a canCreateReturn failure into a Persian response, or nil
// if err isn't one of the known cases.
func mapCreateError(c fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, ErrItemNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "حساب موردنظر یافت نشد"})
	case errors.Is(err, ErrNotReturnable):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "امکان بازگرداندن این بازی وجود ندارد"})
	case errors.Is(err, ErrAlreadyRequested):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"message": "برای این حساب قبلاً درخواست بازگشت ثبت شده است"})
	}
	return nil
}

// pageParams reads ?page and ?limit, clamped to sane bounds (limit 1..100).
func pageParams(c fiber.Ctx) (page, limit, offset int) {
	page, _ = strconv.Atoi(c.Query("page"))
	if page < 1 {
		page = 1
	}
	limit, _ = strconv.Atoi(c.Query("limit"))
	if limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	return page, limit, (page - 1) * limit
}

func pagination(page, limit, total int) fiber.Map {
	totalPages := 1
	if total > 0 && limit > 0 {
		totalPages = (total + limit - 1) / limit
	}
	return fiber.Map{"page": page, "limit": limit, "total": total, "total_pages": totalPages}
}
