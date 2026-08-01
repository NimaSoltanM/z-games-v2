package auth

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v3"
)

func TestRequestOTPProductionFailsWhenDeliveryUnavailable(t *testing.T) {
	t.Setenv("APP_ENV", "production")

	app := fiber.New()
	h := &handler{}
	app.Post("/auth/request-otp", h.requestOTP)

	request := httptest.NewRequest(http.MethodPost, "/auth/request-otp", strings.NewReader(`{"phone":"09123456789"}`))
	request.Header.Set("Content-Type", "application/json")
	response, err := app.Test(request)
	if err != nil {
		t.Fatalf("request OTP: %v", err)
	}
	defer response.Body.Close()

	if response.StatusCode != fiber.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", response.StatusCode, fiber.StatusServiceUnavailable)
	}
	body, err := io.ReadAll(response.Body)
	if err != nil {
		t.Fatalf("read response: %v", err)
	}
	if !strings.Contains(string(body), "ارسال کد تأیید در حال حاضر در دسترس نیست") {
		t.Fatalf("response does not explain unavailable OTP delivery: %s", body)
	}
}
