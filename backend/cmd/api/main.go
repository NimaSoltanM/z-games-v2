package main

import (
	"errors"
	"fmt"
	"log"
	"net"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/soltanmohammdi/z-games/internal/database"
	"github.com/soltanmohammdi/z-games/internal/server"
	"github.com/soltanmohammdi/z-games/internal/shared/credentials"
)

func main() {
	// A local .env is convenient in development, but production platforms usually
	// inject environment variables without mounting a file.
	if err := godotenv.Load(); err != nil && !errors.Is(err, os.ErrNotExist) {
		log.Fatalf("load .env: %v", err)
	}

	if err := validateEnvironment(); err != nil {
		log.Fatal(err)
	}
	if os.Getenv("APP_ENV") == "production" {
		// Login is deliberately unavailable in production until an SMS provider is
		// selected and integrated. The auth endpoint returns an honest 503 instead
		// of claiming an OTP was sent when it was not.
		log.Print("WARNING: production OTP delivery is disabled until an SMS provider is integrated")
	}

	db, err := database.Connect()
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer db.Close()

	app := server.NewApp(db)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3002"
	}

	log.Printf("Server running on :%s", port)
	log.Fatal(app.Listen(":" + port))
}

func validateEnvironment() error {
	appEnv := strings.TrimSpace(os.Getenv("APP_ENV"))
	switch appEnv {
	case "development", "test", "production":
	case "":
		return errors.New("APP_ENV must be set to development, test, or production")
	default:
		return fmt.Errorf("APP_ENV must be development, test, or production (got %q)", appEnv)
	}

	if os.Getenv("DATABASE_URL") == "" {
		return errors.New("DATABASE_URL must be set")
	}
	// An empty or weak JWT secret would make auth tokens forgeable.
	if secret := os.Getenv("JWT_SECRET"); len(secret) < 32 {
		return errors.New("JWT_SECRET must be set and at least 32 characters")
	}
	if os.Getenv("ZARINPAL_MERCHANT_ID") == "" {
		return errors.New("ZARINPAL_MERCHANT_ID must be set (any UUID works for the sandbox)")
	}
	// Losing or changing this key makes delivered credentials unreadable. It must
	// be backed up separately from the database.
	if _, err := credentials.New(os.Getenv("CREDENTIALS_KEY")); err != nil {
		return err
	}

	if appEnv == "production" {
		for _, key := range []string{"FRONTEND_URL", "API_PUBLIC_URL", "UPLOAD_DIR", "RETURN_DIR"} {
			if strings.TrimSpace(os.Getenv(key)) == "" {
				return fmt.Errorf("%s must be set in production", key)
			}
		}
		if os.Getenv("ZARINPAL_SANDBOX") != "false" {
			return errors.New("ZARINPAL_SANDBOX must be false in production")
		}
	}

	for _, proxy := range splitCSV(os.Getenv("TRUSTED_PROXIES")) {
		if net.ParseIP(proxy) != nil {
			continue
		}
		if _, _, err := net.ParseCIDR(proxy); err != nil {
			return fmt.Errorf("TRUSTED_PROXIES contains invalid IP or CIDR %q", proxy)
		}
	}
	return nil
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if value := strings.TrimSpace(part); value != "" {
			out = append(out, value)
		}
	}
	return out
}
