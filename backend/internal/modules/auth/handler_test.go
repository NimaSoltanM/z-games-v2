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

func TestAuthCookieUsesSharedProductionDomain(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("FRONTEND_URL", "https://z-games.store")

	cookie := authCookie("signed-token")
	if cookie.Domain != "z-games.store" {
		t.Fatalf("cookie domain = %q, want z-games.store", cookie.Domain)
	}
	if !cookie.Secure || !cookie.HTTPOnly || cookie.SameSite != "Lax" {
		t.Fatalf("cookie security attributes are incomplete: %#v", cookie)
	}
}

func TestAuthCookieStaysHostOnlyOutsideProduction(t *testing.T) {
	t.Setenv("APP_ENV", "development")
	t.Setenv("FRONTEND_URL", "http://localhost:3000")

	if domain := authCookie("signed-token").Domain; domain != "" {
		t.Fatalf("cookie domain = %q, want host-only cookie", domain)
	}
}

func TestSetAuthCookieMigratesLegacyProductionCookie(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("FRONTEND_URL", "https://z-games.store")

	app := fiber.New()
	app.Get("/login", func(c fiber.Ctx) error {
		setAuthCookie(c, "signed-token")
		return c.SendStatus(fiber.StatusNoContent)
	})

	response, err := app.Test(httptest.NewRequest(http.MethodGet, "/login", nil))
	if err != nil {
		t.Fatalf("set auth cookie: %v", err)
	}
	defer response.Body.Close()

	cookies := response.Cookies()
	if len(cookies) != 2 {
		t.Fatalf("Set-Cookie count = %d, want legacy deletion and shared cookie: %v", len(cookies), response.Header.Values("Set-Cookie"))
	}
	if cookies[0].Domain != "" || cookies[0].MaxAge >= 0 {
		t.Fatalf("first cookie should delete the legacy host-only cookie: %#v", cookies[0])
	}
	if cookies[1].Domain != "z-games.store" || cookies[1].Value != "signed-token" {
		t.Fatalf("second cookie should establish the shared session: %#v", cookies[1])
	}
}

func TestLogoutClearsHostOnlyAndSharedProductionCookies(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("FRONTEND_URL", "https://z-games.store")

	app := fiber.New()
	h := &handler{}
	app.Post("/logout", h.logout)

	response, err := app.Test(httptest.NewRequest(http.MethodPost, "/logout", nil))
	if err != nil {
		t.Fatalf("logout: %v", err)
	}
	defer response.Body.Close()

	cookies := response.Cookies()
	if len(cookies) != 2 {
		t.Fatalf("Set-Cookie count = %d, want host-only and shared deletions: %v", len(cookies), response.Header.Values("Set-Cookie"))
	}
	if cookies[0].Domain != "" || cookies[0].MaxAge >= 0 {
		t.Fatalf("first cookie should delete the host-only session: %#v", cookies[0])
	}
	if cookies[1].Domain != "z-games.store" || cookies[1].MaxAge >= 0 {
		t.Fatalf("second cookie should delete the shared session: %#v", cookies[1])
	}
}
