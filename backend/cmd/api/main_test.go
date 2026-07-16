package main

import (
	"strings"
	"testing"
)

func setValidTestEnv(t *testing.T) {
	t.Helper()
	t.Setenv("APP_ENV", "test")
	t.Setenv("DATABASE_URL", "postgres://localhost/z_games_test")
	t.Setenv("JWT_SECRET", strings.Repeat("x", 32))
	t.Setenv("ZARINPAL_MERCHANT_ID", "00000000-0000-0000-0000-000000000000")
	t.Setenv("CREDENTIALS_KEY", "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
	t.Setenv("TRUSTED_PROXIES", "")
}

func TestValidateEnvironmentAcceptsTestConfig(t *testing.T) {
	setValidTestEnv(t)
	if err := validateEnvironment(); err != nil {
		t.Fatalf("validateEnvironment: %v", err)
	}
}

func TestValidateEnvironmentRequiresExplicitMode(t *testing.T) {
	setValidTestEnv(t)
	t.Setenv("APP_ENV", "")
	if err := validateEnvironment(); err == nil {
		t.Fatal("expected missing APP_ENV to fail")
	}
}

func TestValidateEnvironmentRequiresProductionPaths(t *testing.T) {
	setValidTestEnv(t)
	t.Setenv("APP_ENV", "production")
	if err := validateEnvironment(); err == nil {
		t.Fatal("expected missing production paths to fail")
	}
}

func TestValidateEnvironmentRejectsInvalidProxy(t *testing.T) {
	setValidTestEnv(t)
	t.Setenv("TRUSTED_PROXIES", "not-an-ip")
	if err := validateEnvironment(); err == nil {
		t.Fatal("expected invalid trusted proxy to fail")
	}
}

func TestValidateEnvironmentRejectsSandboxPaymentsInProduction(t *testing.T) {
	setValidTestEnv(t)
	t.Setenv("APP_ENV", "production")
	t.Setenv("FRONTEND_URL", "https://example.com")
	t.Setenv("API_PUBLIC_URL", "https://api.example.com")
	t.Setenv("UPLOAD_DIR", "/data/uploads")
	t.Setenv("RETURN_DIR", "/data/returns")
	t.Setenv("ZARINPAL_SANDBOX", "true")
	if err := validateEnvironment(); err == nil {
		t.Fatal("expected sandbox payments in production to fail")
	}
}

func TestSplitCSV(t *testing.T) {
	got := splitCSV(" 127.0.0.1, 10.0.0.0/8, ")
	if len(got) != 2 || got[0] != "127.0.0.1" || got[1] != "10.0.0.0/8" {
		t.Fatalf("splitCSV = %#v", got)
	}
}
