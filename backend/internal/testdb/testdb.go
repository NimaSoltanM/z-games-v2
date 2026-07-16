// Package testdb spins up a clean schema in a throwaway PostgreSQL database for
// integration tests. Tests that use it self-skip unless TEST_DATABASE_URL is set,
// so `go test ./...` still passes with no database available.
package testdb

import (
	"context"
	_ "embed"
	"os"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// schema.sql is a schema-only dump of the live database (no data). It lets the
// integration tests build a real, current schema without depending on the dev DB.
//
//go:embed schema.sql
var schemaSQL string

// New connects to TEST_DATABASE_URL, resets it to a clean schema, and returns a
// pool. It skips the test when the env var is unset and refuses to run unless the
// URL names a database containing "test", so it can never wipe a real database.
func New(t *testing.T) *pgxpool.Pool {
	t.Helper()

	url := getTestURL(t)

	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		t.Fatalf("parse TEST_DATABASE_URL: %v", err)
	}
	// Keep the pool on the default (extended) protocol so it matches production —
	// notably, timestamps bind the same way the app relies on. Simple protocol is
	// used per-call only for the multi-statement schema setup below.

	ctx := context.Background()
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatalf("connect test db: %v", err)
	}

	// `go test` runs different packages' test binaries in parallel against this
	// shared database. Hold a session advisory lock for the whole test so the
	// schema resets below never overlap and clobber a concurrently-running test.
	lockConn, err := pool.Acquire(ctx)
	if err != nil {
		pool.Close()
		t.Fatalf("acquire lock conn: %v", err)
	}
	if _, err := lockConn.Exec(ctx, "SELECT pg_advisory_lock(48723)"); err != nil {
		lockConn.Release()
		pool.Close()
		t.Fatalf("advisory lock: %v", err)
	}
	t.Cleanup(func() {
		_, _ = lockConn.Exec(context.Background(), "SELECT pg_advisory_unlock(48723)")
		lockConn.Release()
		pool.Close()
	})

	// Simple protocol is required to run these multi-statement scripts in one call.
	reset := `DROP SCHEMA IF EXISTS public CASCADE;
		CREATE SCHEMA public;`
	if _, err := pool.Exec(ctx, reset, pgx.QueryExecModeSimpleProtocol); err != nil {
		t.Fatalf("reset schema: %v", err)
	}
	if _, err := pool.Exec(ctx, loadableSchema(), pgx.QueryExecModeSimpleProtocol); err != nil {
		t.Fatalf("load schema: %v", err)
	}
	return pool
}

func getTestURL(t *testing.T) string {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping DB integration test")
	}
	if !strings.Contains(url, "test") {
		t.Fatalf("refusing to run: TEST_DATABASE_URL %q must name a database containing \"test\"", url)
	}
	return url
}

// loadableSchema strips the psql-only meta-commands and the search_path reset
// from the pg_dump output so it can run over the wire via pgx.
func loadableSchema() string {
	var b strings.Builder
	for line := range strings.SplitSeq(schemaSQL, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, `\`) {
			continue // \restrict / \unrestrict
		}
		if strings.HasPrefix(trimmed, "SELECT pg_catalog.set_config('search_path'") {
			continue // would blank the search_path for pooled connections
		}
		b.WriteString(line)
		b.WriteByte('\n')
	}
	return b.String()
}
