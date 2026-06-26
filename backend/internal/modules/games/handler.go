package games

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/paginate"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/middleware"
)

var sortColMap = map[string]string{
	"name":       "name",
	"created_at": "created_at",
	"platform":   "platform",
}

type handler struct {
	db *pgxpool.Pool
}

func (h *handler) listGamesHandler(c fiber.Ctx) error {
	pageInfo, ok := paginate.FromContext(c)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "پارامترهای صفحه‌بندی نامعتبر است"})
	}

	filter := listFilter{
		platform:   strings.TrimSpace(c.Query("platform")),
		zarfiat:    strings.TrimSpace(c.Query("zarfiat")),
		search:     strings.TrimSpace(c.Query("search")),
		onlyActive: true,
	}

	orderBy := buildOrderBy(pageInfo.Sort)
	games, total, err := listGames(c.Context(), h.db, filter, orderBy, pageInfo.Limit, pageInfo.Start())
	if err != nil {
		return fmt.Errorf("list games: %w", err)
	}

	rate, err := getExchangeRate(c.Context(), h.db)
	if err != nil {
		return fmt.Errorf("get exchange rate: %w", err)
	}

	totalPages := 1
	if pageInfo.Limit > 0 && total > 0 {
		totalPages = int(math.Ceil(float64(total) / float64(pageInfo.Limit)))
	}

	return c.JSON(fiber.Map{
		"games":         games,
		"exchange_rate": rate,
		"pagination": fiber.Map{
			"page":        pageInfo.Page,
			"limit":       pageInfo.Limit,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

func (h *handler) getGameHandler(c fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "شناسه بازی الزامی است"})
	}

	game, err := getGameByID(c.Context(), h.db, id, true)
	if err != nil {
		return fmt.Errorf("get game: %w", err)
	}
	if game == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "بازی مورد نظر یافت نشد"})
	}

	rate, err := getExchangeRate(c.Context(), h.db)
	if err != nil {
		return fmt.Errorf("get exchange rate: %w", err)
	}

	return c.JSON(fiber.Map{
		"game":          game,
		"exchange_rate": rate,
	})
}

func (h *handler) getExchangeRateHandler(c fiber.Ctx) error {
	rate, err := getExchangeRate(c.Context(), h.db)
	if err != nil {
		return fmt.Errorf("get exchange rate: %w", err)
	}
	return c.JSON(fiber.Map{"exchange_rate": rate})
}

// --- admin: pre-order lifecycle & alerts ------------------------------------

var errBadReleaseDate = errors.New("invalid release date")

// preorderUpdate is the parsed admin pre-order request. updateDate distinguishes
// "the date field was provided" from "it was omitted", so a status-only change
// leaves the stored release date untouched.
type preorderUpdate struct {
	status      string
	updateDate  bool
	releaseDate *time.Time
}

// parsePreorderUpdate reads the admin pre-order PATCH body. release_status is
// required. release_date is a partial field: ABSENT means "leave the existing
// date untouched" — so flipping the status off and back on is a non-destructive
// pause — while null or "" clears it and a date string (ISO or YYYY-MM-DD) sets it.
func parsePreorderUpdate(body []byte) (preorderUpdate, error) {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(body, &raw); err != nil {
		return preorderUpdate{}, fmt.Errorf("parsePreorderUpdate: %w", err)
	}

	rawStatus, ok := raw["release_status"]
	if !ok {
		return preorderUpdate{}, fmt.Errorf("release_status is required")
	}
	var upd preorderUpdate
	if err := json.Unmarshal(rawStatus, &upd.status); err != nil {
		return preorderUpdate{}, fmt.Errorf("parsePreorderUpdate status: %w", err)
	}

	rawDate, present := raw["release_date"]
	if !present {
		return upd, nil // absent → preserve the existing date (pause/resume)
	}
	upd.updateDate = true
	if strings.TrimSpace(string(rawDate)) == "null" {
		return upd, nil // explicit clear
	}
	var s string
	if err := json.Unmarshal(rawDate, &s); err != nil {
		return preorderUpdate{}, errBadReleaseDate
	}
	if strings.TrimSpace(s) == "" {
		return upd, nil // empty string → clear
	}
	t, err := parseReleaseDate(s)
	if err != nil {
		return preorderUpdate{}, errBadReleaseDate
	}
	upd.releaseDate = &t
	return upd, nil
}

// adminSetPreorder sets a game's release status (released | pre_order) and,
// optionally, its expected release date. Omitting release_date preserves the
// stored one, so toggling the status acts as a lossless pause. Returns the game.
func (h *handler) adminSetPreorder(c fiber.Ctx) error {
	adminID := c.Locals(middleware.LocalUserID).(string)
	id := c.Params("id")

	upd, err := parsePreorderUpdate(c.Body())
	if errors.Is(err, errBadReleaseDate) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "تاریخ انتشار نامعتبر است"})
	}
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}

	err = setGamePreorder(c.Context(), h.db, adminID, id, upd.status, upd.updateDate, upd.releaseDate)
	switch {
	case errors.Is(err, ErrGameNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "بازی مورد نظر یافت نشد"})
	case errors.Is(err, ErrInvalidInput):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "وضعیت انتشار نامعتبر است"})
	case err != nil:
		return err
	}

	return h.respondGame(c, id)
}

// adminSetAlert sets or clears the free-form admin notice on a game. An empty
// message clears it. Returns the updated game.
func (h *handler) adminSetAlert(c fiber.Ctx) error {
	adminID := c.Locals(middleware.LocalUserID).(string)
	id := c.Params("id")

	var body struct {
		Message string `json:"message"`
		Variant string `json:"variant"`
	}
	if err := c.Bind().JSON(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}

	err := setGameAlert(c.Context(), h.db, adminID, id, body.Message, body.Variant)
	switch {
	case errors.Is(err, ErrGameNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "بازی مورد نظر یافت نشد"})
	case errors.Is(err, ErrInvalidInput):
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "نوع اعلان نامعتبر است"})
	case err != nil:
		return err
	}

	return h.respondGame(c, id)
}

// --- admin: game CRUD + exchange rate ---------------------------------------

// adminListGames returns the full catalog (active and inactive) plus the current
// exchange rate, for the admin management screen.
func (h *handler) adminListGames(c fiber.Ctx) error {
	games, _, err := listGames(c.Context(), h.db, listFilter{onlyActive: false}, "created_at DESC", 500, 0)
	if err != nil {
		return fmt.Errorf("adminListGames: %w", err)
	}
	rate, err := getExchangeRate(c.Context(), h.db)
	if err != nil {
		return fmt.Errorf("adminListGames rate: %w", err)
	}
	return c.JSON(fiber.Map{"games": games, "exchange_rate": rate})
}

// adminGetGame returns a single game (any active state) for the edit screen.
func (h *handler) adminGetGame(c fiber.Ctx) error {
	return h.respondGame(c, c.Params("id"))
}

func (h *handler) adminCreateGame(c fiber.Ctx) error {
	adminID := c.Locals(middleware.LocalUserID).(string)

	var in gameInput
	if err := c.Bind().JSON(&in); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}
	norm, msg, ok := validateGameInput(in)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": msg})
	}

	id, err := createGame(c.Context(), h.db, adminID, norm)
	if errors.Is(err, ErrDuplicateLink) {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"message": "این لینک قبلاً برای بازی دیگری ثبت شده است"})
	}
	if err != nil {
		return err
	}

	game, err := getGameByID(c.Context(), h.db, id, false)
	if err != nil {
		return fmt.Errorf("adminCreateGame load: %w", err)
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"game": game})
}

func (h *handler) adminUpdateGame(c fiber.Ctx) error {
	adminID := c.Locals(middleware.LocalUserID).(string)
	id := c.Params("id")

	var in gameInput
	if err := c.Bind().JSON(&in); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}
	norm, msg, ok := validateGameInput(in)
	if !ok {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": msg})
	}

	err := updateGame(c.Context(), h.db, adminID, id, norm)
	switch {
	case errors.Is(err, ErrGameNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "بازی مورد نظر یافت نشد"})
	case errors.Is(err, ErrDuplicateLink):
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"message": "این لینک قبلاً برای بازی دیگری ثبت شده است"})
	case err != nil:
		return err
	}
	return h.respondGame(c, id)
}

func (h *handler) adminDeleteGame(c fiber.Ctx) error {
	adminID := c.Locals(middleware.LocalUserID).(string)
	err := deleteGame(c.Context(), h.db, adminID, c.Params("id"))
	switch {
	case errors.Is(err, ErrGameNotFound):
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "بازی مورد نظر یافت نشد"})
	case err != nil:
		return err
	}
	return c.JSON(fiber.Map{"message": "بازی حذف شد"})
}

func (h *handler) adminGetExchangeRate(c fiber.Ctx) error {
	rate, err := getExchangeRate(c.Context(), h.db)
	if err != nil {
		return fmt.Errorf("adminGetExchangeRate: %w", err)
	}
	var value any
	if rate != nil {
		value = rate.USDToToman
	}
	return c.JSON(fiber.Map{"usd_to_toman": value})
}

func (h *handler) adminSetExchangeRate(c fiber.Ctx) error {
	adminID := c.Locals(middleware.LocalUserID).(string)
	var body struct {
		USDToToman int `json:"usd_to_toman"`
	}
	if err := c.Bind().JSON(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}
	if err := setExchangeRate(c.Context(), h.db, adminID, body.USDToToman); err != nil {
		if errors.Is(err, ErrInvalidInput) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "نرخ ارز باید بزرگ‌تر از صفر باشد"})
		}
		return err
	}
	return c.JSON(fiber.Map{"usd_to_toman": body.USDToToman})
}

// respondGame returns a game by id without the active-only filter (admin view).
func (h *handler) respondGame(c fiber.Ctx, id string) error {
	game, err := getGameByID(c.Context(), h.db, id, false)
	if err != nil {
		return fmt.Errorf("respondGame: %w", err)
	}
	if game == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "بازی مورد نظر یافت نشد"})
	}
	return c.JSON(fiber.Map{"game": game})
}

// parseReleaseDate accepts a full ISO-8601 timestamp or a plain YYYY-MM-DD date,
// normalising to UTC.
func parseReleaseDate(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t.UTC(), nil
	}
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return t.UTC(), nil
	}
	return time.Time{}, fmt.Errorf("invalid release date %q", s)
}

func buildOrderBy(sorts []paginate.SortField) string {
	var parts []string
	for _, s := range sorts {
		col, ok := sortColMap[s.Field]
		if !ok {
			continue
		}
		dir := "ASC"
		if s.Order == paginate.DESC {
			dir = "DESC"
		}
		parts = append(parts, col+" "+dir)
	}
	if len(parts) == 0 {
		return "created_at DESC"
	}
	return strings.Join(parts, ", ")
}
