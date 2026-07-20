package auth

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v3"
	"github.com/soltanmohammdi/z-games/internal/testdb"
)

type failingOTPSender struct{}

func (failingOTPSender) Send(context.Context, string, string) error {
	return errors.New("provider unavailable")
}

func TestRequestOTPDeliveryFailureDiscardsIssuedCode(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	db := testdb.New(t)
	phone := "09120000007"

	app := fiber.New()
	h := &handler{db: db, otpSender: failingOTPSender{}}
	app.Post("/auth/request-otp", h.requestOTP)

	request := httptest.NewRequest(http.MethodPost, "/auth/request-otp", strings.NewReader(`{"phone":"`+phone+`"}`))
	request.Header.Set("Content-Type", "application/json")
	response, err := app.Test(request)
	if err != nil {
		t.Fatalf("request OTP: %v", err)
	}
	defer response.Body.Close()
	if response.StatusCode != fiber.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", response.StatusCode, fiber.StatusServiceUnavailable)
	}

	var count int
	if err := db.QueryRow(context.Background(), "SELECT COUNT(*) FROM otp_codes WHERE phone = $1", phone).Scan(&count); err != nil {
		t.Fatalf("count OTP rows: %v", err)
	}
	if count != 0 {
		t.Fatalf("OTP row count = %d, want 0 after delivery failure", count)
	}
}
