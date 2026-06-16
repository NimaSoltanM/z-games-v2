package middleware

import (
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/limiter"
)

// RateLimiter throttles a route to at most max requests per window per client IP,
// answering with a Persian 429 when exceeded.
//
// Apply this ONLY to browser-direct endpoints (OTP, register, checkout). Never
// put it on endpoints the SSR server calls on the user's behalf (GET /auth/me,
// cart, orders): those all arrive from the SSR server's single IP, so a per-IP
// limit there would throttle every user at once.
//
// Keyed on c.IP(). Behind a reverse proxy in production the app must be
// configured to trust the proxy so c.IP() resolves to the real client; otherwise
// every request shares the proxy's IP and trips the limit together.
func RateLimiter(max int, window time.Duration) fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        max,
		Expiration: window,
		LimitReached: func(c fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"message": "درخواست‌های زیادی ارسال شده است. لطفاً کمی بعد دوباره تلاش کنید",
			})
		},
	})
}
