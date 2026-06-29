package cart

import (
	"errors"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/middleware"
)

const maxMergeItems = 50

type handler struct {
	db *pgxpool.Pool
}

func cartDBError(err error) error {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23503": // foreign_key_violation
			// The console/capacity FK and the game_id FK both surface here; tell them
			// apart by the constraint name so the message is accurate.
			if pgErr.ConstraintName == "cart_items_capacity_fkey" {
				return fiber.NewError(fiber.StatusBadRequest, "کنسول یا ظرفیت انتخابی نامعتبر است")
			}
			return fiber.NewError(fiber.StatusBadRequest, "بازی مورد نظر یافت نشد")
		case "23514": // check_violation — quantity out of range
			return fiber.NewError(fiber.StatusBadRequest, "اطلاعات ورودی نامعتبر است")
		}
	}
	return err
}

func (h *handler) getCart(c fiber.Ctx) error {
	userID := c.Locals(middleware.LocalUserID).(string)

	items, err := getCartItems(c.Context(), h.db, userID)
	if err != nil {
		return err
	}

	type itemResp struct {
		ID         string  `json:"id"`
		GameID     string  `json:"game_id"`
		GameName   string  `json:"game_name"`
		CoverImage *string `json:"cover_image"`
		Platform   string  `json:"platform"`
		Zarfiat    string  `json:"zarfiat"`
		Quantity   int     `json:"quantity"`
	}

	result := make([]itemResp, 0, len(items))
	for _, item := range items {
		result = append(result, itemResp{
			ID:         item.ID,
			GameID:     item.GameID,
			GameName:   item.GameName,
			CoverImage: item.CoverImage,
			Platform:   item.Platform,
			Zarfiat:    item.Zarfiat,
			Quantity:   item.Quantity,
		})
	}

	return c.JSON(fiber.Map{"items": result})
}

func (h *handler) addItem(c fiber.Ctx) error {
	userID := c.Locals(middleware.LocalUserID).(string)

	var body struct {
		GameID   string `json:"game_id"`
		Platform string `json:"platform"`
		Zarfiat  string `json:"zarfiat"`
		Quantity int    `json:"quantity"`
	}
	if err := c.Bind().JSON(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}
	if body.GameID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}
	if body.Quantity <= 0 {
		body.Quantity = 1
	}
	if body.Quantity > 10 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "حداکثر تعداد هر محصول ۱۰ عدد است"})
	}

	if err := upsertCartItem(c.Context(), h.db, userID, upsertInput{
		GameID:   body.GameID,
		Platform: body.Platform,
		Zarfiat:  body.Zarfiat,
		Quantity: body.Quantity,
	}); err != nil {
		return cartDBError(err)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "محصول به سبد اضافه شد"})
}

func (h *handler) updateItem(c fiber.Ctx) error {
	userID := c.Locals(middleware.LocalUserID).(string)

	var body struct {
		GameID   string `json:"game_id"`
		Platform string `json:"platform"`
		Zarfiat  string `json:"zarfiat"`
		Quantity int    `json:"quantity"`
	}
	if err := c.Bind().JSON(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}
	if body.GameID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}
	if body.Quantity > 10 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "حداکثر تعداد هر محصول ۱۰ عدد است"})
	}

	if err := setCartItemQty(c.Context(), h.db, userID, body.GameID, body.Platform, body.Zarfiat, body.Quantity); err != nil {
		return cartDBError(err)
	}

	return c.JSON(fiber.Map{"message": "سبد خرید به‌روز شد"})
}

func (h *handler) removeItem(c fiber.Ctx) error {
	userID := c.Locals(middleware.LocalUserID).(string)

	var body struct {
		GameID   string `json:"game_id"`
		Platform string `json:"platform"`
		Zarfiat  string `json:"zarfiat"`
	}
	if err := c.Bind().JSON(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}
	if body.GameID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}

	if err := deleteCartItem(c.Context(), h.db, userID, body.GameID, body.Platform, body.Zarfiat); err != nil {
		return err
	}

	return c.JSON(fiber.Map{"message": "محصول از سبد حذف شد"})
}

func (h *handler) clearCart(c fiber.Ctx) error {
	userID := c.Locals(middleware.LocalUserID).(string)

	if err := clearCartItems(c.Context(), h.db, userID); err != nil {
		return err
	}

	return c.JSON(fiber.Map{"message": "سبد خرید پاک شد"})
}

func (h *handler) mergeCartHandler(c fiber.Ctx) error {
	userID := c.Locals(middleware.LocalUserID).(string)

	var body struct {
		Items []struct {
			GameID   string `json:"game_id"`
			Platform string `json:"platform"`
			Zarfiat  string `json:"zarfiat"`
			Quantity int    `json:"quantity"`
		} `json:"items"`
	}
	if err := c.Bind().JSON(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}
	if len(body.Items) > maxMergeItems {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "تعداد آیتم‌های ارسالی بیش از حد مجاز است"})
	}

	items := make([]mergeItem, 0, len(body.Items))
	for _, item := range body.Items {
		items = append(items, mergeItem{
			GameID:   item.GameID,
			Platform: item.Platform,
			Zarfiat:  item.Zarfiat,
			Quantity: item.Quantity,
		})
	}

	if err := mergeCart(c.Context(), h.db, userID, items); err != nil {
		return err
	}

	return c.JSON(fiber.Map{"message": "سبد خرید ادغام شد"})
}
