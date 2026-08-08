package support

import (
	"errors"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/middleware"
)

type handler struct{ db *pgxpool.Pool }

type createInput struct {
	Subject  string `json:"subject"`
	Category string `json:"category"`
	Body     string `json:"body"`
}

type replyInput struct {
	Body string `json:"body"`
}

func (h *handler) create(c fiber.Ctx) error {
	var body createInput
	if err := c.Bind().JSON(&body); err != nil {
		return badRequest(c, "اطلاعات ورودی نامعتبر است")
	}
	id, err := createTicket(c.Context(), h.db, c.Locals(middleware.LocalUserID).(string), body.Subject, body.Category, body.Body)
	if resp := mapInputError(c, err); resp != nil {
		return resp
	}
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"id": id})
}

func (h *handler) listMine(c fiber.Ctx) error {
	page, offset := pageParams(c)
	items, total, err := listUserTickets(c.Context(), h.db, c.Locals(middleware.LocalUserID).(string), pageSize, offset)
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"tickets": items, "pagination": pagination(page, total)})
}

func (h *handler) getMine(c fiber.Ctx) error {
	return h.get(c, false)
}

func (h *handler) getAdmin(c fiber.Ctx) error {
	return h.get(c, true)
}

func (h *handler) get(c fiber.Ctx, admin bool) error {
	userID := c.Locals(middleware.LocalUserID).(string)
	detail, err := getTicket(c.Context(), h.db, c.Params("id"), userID, admin)
	if err != nil {
		return err
	}
	if detail == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "درخواست پشتیبانی یافت نشد"})
	}
	return c.JSON(detail)
}

func (h *handler) replyMine(c fiber.Ctx) error  { return h.reply(c, false) }
func (h *handler) replyAdmin(c fiber.Ctx) error { return h.reply(c, true) }

func (h *handler) reply(c fiber.Ctx, admin bool) error {
	var body replyInput
	if err := c.Bind().JSON(&body); err != nil {
		return badRequest(c, "اطلاعات ورودی نامعتبر است")
	}
	userID := c.Locals(middleware.LocalUserID).(string)
	err := addReply(c.Context(), h.db, c.Params("id"), userID, body.Body, admin)
	if errors.Is(err, ErrTicketNotFound) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "درخواست پشتیبانی یافت نشد"})
	}
	if resp := mapInputError(c, err); resp != nil {
		return resp
	}
	if err != nil {
		return err
	}
	detail, err := getTicket(c.Context(), h.db, c.Params("id"), userID, admin)
	if err != nil {
		return err
	}
	return c.JSON(detail)
}

func (h *handler) adminList(c fiber.Ctx) error {
	page, offset := pageParams(c)
	items, total, err := listAdminTickets(c.Context(), h.db, adminFilter{
		Status: strings.TrimSpace(c.Query("status")), Search: strings.TrimSpace(c.Query("search")), Limit: pageSize, Offset: offset,
	})
	if errors.Is(err, ErrInvalidStatus) {
		return badRequest(c, "وضعیت انتخاب‌شده معتبر نیست")
	}
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"tickets": items, "pagination": pagination(page, total)})
}

func (h *handler) adminStatus(c fiber.Ctx) error {
	var body struct {
		Status string `json:"status"`
	}
	if err := c.Bind().JSON(&body); err != nil {
		return badRequest(c, "اطلاعات ورودی نامعتبر است")
	}
	err := setStatus(c.Context(), h.db, c.Params("id"), c.Locals(middleware.LocalUserID).(string), body.Status)
	switch {
	case errors.Is(err, ErrInvalidStatus):
		return badRequest(c, "وضعیت انتخاب‌شده معتبر نیست")
	case errors.Is(err, ErrTicketNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "درخواست پشتیبانی یافت نشد"})
	case err != nil:
		return err
	}
	return h.get(c, true)
}

func mapInputError(c fiber.Ctx, err error) error {
	switch {
	case errors.Is(err, ErrInvalidSubject):
		return badRequest(c, "عنوان درخواست باید بین ۱ تا ۱۶۰ نویسه باشد")
	case errors.Is(err, ErrInvalidMessage):
		return badRequest(c, "متن درخواست باید بین ۱ تا ۴۰۰۰ نویسه باشد")
	case errors.Is(err, ErrInvalidCategory):
		return badRequest(c, "موضوع انتخاب‌شده معتبر نیست")
	default:
		return nil
	}
}

func badRequest(c fiber.Ctx, message string) error {
	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": message})
}

func pageParams(c fiber.Ctx) (int, int) {
	page, _ := strconv.Atoi(c.Query("page"))
	if page < 1 {
		page = 1
	}
	return page, (page - 1) * pageSize
}

func pagination(page, total int) fiber.Map {
	totalPages := 1
	if total > 0 {
		totalPages = (total + pageSize - 1) / pageSize
	}
	return fiber.Map{"page": page, "limit": pageSize, "total": total, "total_pages": totalPages}
}
