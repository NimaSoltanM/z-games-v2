package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net"
	"net/url"
	"os"
	"strconv"
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

	db, err := database.Connect()
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}
	defer db.Close()
	if err := database.ValidateSchema(context.Background(), db); err != nil {
		log.Fatalf("database schema validation failed: %v", err)
	}

	app := server.NewApp(db)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3002"
	}
	host := strings.TrimSpace(os.Getenv("HOST"))
	address := ":" + port
	if host != "" {
		address = net.JoinHostPort(host, port)
	}

	log.Printf("Server running on %s", address)
	log.Fatal(app.Listen(address))
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
	providerApprovalMode := os.Getenv("PROVIDER_APPROVAL_MODE") == "true"
	if raw := os.Getenv("PROVIDER_APPROVAL_MODE"); raw != "" && raw != "true" && raw != "false" {
		return errors.New("PROVIDER_APPROVAL_MODE must be true or false")
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
		frontendURL, err := parseProductionOrigin("FRONTEND_URL", os.Getenv("FRONTEND_URL"))
		if err != nil {
			return err
		}
		apiURL, err := parseProductionOrigin("API_PUBLIC_URL", os.Getenv("API_PUBLIC_URL"))
		if err != nil {
			return err
		}
		frontendHost := frontendURL.Hostname()
		apiHost := apiURL.Hostname()
		if apiHost != frontendHost && !strings.HasSuffix(apiHost, "."+frontendHost) {
			return errors.New("API_PUBLIC_URL host must equal or be a subdomain of FRONTEND_URL so authentication cookies can be shared")
		}
		if providerApprovalMode {
			if os.Getenv("ZARINPAL_SANDBOX") != "true" {
				return errors.New("ZARINPAL_SANDBOX must be true in provider approval mode")
			}
		} else {
			if os.Getenv("ZARINPAL_SANDBOX") != "false" {
				return errors.New("ZARINPAL_SANDBOX must be false in production")
			}
			for _, key := range []string{"PAYAMAK_PANEL_USERNAME", "PAYAMAK_PANEL_API_KEY", "PAYAMAK_PANEL_BODY_ID"} {
				if strings.TrimSpace(os.Getenv(key)) == "" {
					return fmt.Errorf("%s must be set in production", key)
				}
			}
		}
	}

	if rawBodyID := strings.TrimSpace(os.Getenv("PAYAMAK_PANEL_BODY_ID")); rawBodyID != "" {
		bodyID, err := strconv.Atoi(rawBodyID)
		if err != nil || bodyID <= 0 {
			return errors.New("PAYAMAK_PANEL_BODY_ID must be a positive integer")
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

func parseProductionOrigin(name, value string) (*url.URL, error) {
	parsed, err := url.ParseRequestURI(strings.TrimSpace(value))
	if err != nil || parsed.Scheme != "https" || parsed.Hostname() == "" || parsed.User != nil {
		return nil, fmt.Errorf("%s must be a valid HTTPS origin", name)
	}
	if (parsed.Path != "" && parsed.Path != "/") || parsed.RawQuery != "" || parsed.Fragment != "" {
		return nil, fmt.Errorf("%s must not include a path, query, or fragment", name)
	}
	return parsed, nil
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
