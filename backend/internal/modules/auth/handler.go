package auth

import (
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/shared/middleware"
)

const (
	authCookieName   = "auth_token"
	authCookieMaxAge = 60 * 60 * 24 * 30 // 30 days
)

func authCookie(token string) *fiber.Cookie {
	isProd := os.Getenv("APP_ENV") == "production"
	return &fiber.Cookie{
		Name:     authCookieName,
		Value:    token,
		HTTPOnly: true,
		Secure:   isProd,
		SameSite: "Lax",
		MaxAge:   authCookieMaxAge,
		Path:     "/",
	}
}

type handler struct {
	db *pgxpool.Pool
}

func (h *handler) requestOTP(c fiber.Ctx) error {
	if os.Getenv("APP_ENV") == "production" {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"message": "ارسال کد تأیید هنوز فعال نشده است. لطفاً بعداً دوباره تلاش کنید",
		})
	}

	var body struct {
		Phone string `json:"phone"`
	}
	if err := c.Bind().JSON(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}
	body.Phone = strings.TrimSpace(body.Phone)
	if !validIranianMobile(body.Phone) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "شماره تلفن نامعتبر است"})
	}

	code, err := requestOTP(c.Context(), h.db, body.Phone)
	if errors.Is(err, ErrRateLimited) {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"message": "درخواست‌های زیادی ارسال شده‌اید. لطفاً چند دقیقه بعد تلاش کنید",
		})
	}
	if err != nil {
		return err
	}

	resp := fiber.Map{"message": "کد تأیید ارسال شد"}
	if os.Getenv("APP_ENV") != "production" {
		resp["dev_code"] = code
	}
	return c.JSON(resp)
}

func (h *handler) verifyOTP(c fiber.Ctx) error {
	var body struct {
		Phone string `json:"phone"`
		Code  string `json:"code"`
	}
	if err := c.Bind().JSON(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}
	body.Phone = strings.TrimSpace(body.Phone)
	body.Code = strings.TrimSpace(body.Code)
	if !validIranianMobile(body.Phone) || len(body.Code) != 5 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}

	result, err := verifyOTP(c.Context(), h.db, body.Phone, body.Code)
	if errors.Is(err, ErrOTPNotFound) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "کد تأیید نامعتبر یا منقضی شده است"})
	}
	if errors.Is(err, ErrOTPInvalid) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "کد تأیید اشتباه است"})
	}
	if errors.Is(err, ErrOTPBurned) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "این کد غیرفعال شده است. لطفاً کد جدیدی درخواست کنید"})
	}
	if err != nil {
		return err
	}

	if result.status == "existing" {
		token, err := middleware.SignAuthToken(result.userID, normalizePhone(body.Phone))
		if err != nil {
			return fmt.Errorf("sign auth token: %w", err)
		}
		c.Cookie(authCookie(token))
		return c.JSON(fiber.Map{"status": "existing"})
	}

	regToken, err := middleware.SignRegistrationToken(normalizePhone(body.Phone))
	if err != nil {
		return fmt.Errorf("sign registration token: %w", err)
	}
	return c.JSON(fiber.Map{"status": "new", "registration_token": regToken})
}

func (h *handler) register(c fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "احراز هویت الزامی است"})
	}
	regToken := authHeader[7:]

	phone, err := middleware.VerifyRegistrationToken(regToken)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "توکن نامعتبر یا منقضی شده است"})
	}

	var body struct {
		FirstName    string `json:"first_name"`
		LastName     string `json:"last_name"`
		ReferralCode string `json:"referral_code"`
	}
	if err := c.Bind().JSON(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "اطلاعات ورودی نامعتبر است"})
	}
	body.FirstName = strings.TrimSpace(body.FirstName)
	body.LastName = strings.TrimSpace(body.LastName)
	if body.FirstName == "" || body.LastName == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "نام و نام خانوادگی الزامی است"})
	}

	user, err := registerUser(c.Context(), h.db, registerInput{
		phone:      phone,
		firstName:  body.FirstName,
		lastName:   body.LastName,
		referredBy: strings.TrimSpace(body.ReferralCode),
	})
	if err != nil {
		if strings.Contains(err.Error(), "unique") {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"message": "این شماره تلفن قبلاً ثبت شده است"})
		}
		return err
	}

	token, err := middleware.SignAuthToken(user.ID, user.Phone)
	if err != nil {
		return fmt.Errorf("sign auth token: %w", err)
	}
	c.Cookie(authCookie(token))
	return c.JSON(fiber.Map{"message": "ثبت‌نام موفق"})
}

func (h *handler) me(c fiber.Ctx) error {
	userID := c.Locals(middleware.LocalUserID).(string)

	user, err := getMe(c.Context(), h.db, userID)
	if err != nil {
		return err
	}
	if user == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "نشست منقضی شده است. لطفاً دوباره وارد شوید"})
	}

	return c.JSON(fiber.Map{
		"userId":    user.ID,
		"phone":     user.Phone,
		"firstName": user.FirstName,
		"lastName":  user.LastName,
		"role":      user.Role,
	})
}

func (h *handler) logout(c fiber.Ctx) error {
	c.Cookie(&fiber.Cookie{
		Name:    authCookieName,
		Value:   "",
		Expires: time.Unix(0, 0),
		Path:    "/",
	})
	return c.JSON(fiber.Map{"message": "خروج موفق"})
}
