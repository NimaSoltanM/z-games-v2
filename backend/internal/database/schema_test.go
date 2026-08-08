package database_test

import (
	"context"
	"strings"
	"testing"

	"github.com/soltanmohammdi/z-games/internal/database"
	"github.com/soltanmohammdi/z-games/internal/testdb"
)

func TestValidateSchema(t *testing.T) {
	db := testdb.New(t)
	ctx := context.Background()

	if err := database.ValidateSchema(ctx, db); err != nil {
		t.Fatalf("validate current schema: %v", err)
	}

	if _, err := db.Exec(ctx, "ALTER TABLE games DROP COLUMN seo_title"); err != nil {
		t.Fatalf("remove required test column: %v", err)
	}
	err := database.ValidateSchema(ctx, db)
	if err == nil {
		t.Fatal("expected outdated schema error")
	}
	for _, expected := range []string{"games.seo_title", "021_operational_retention.sql"} {
		if !strings.Contains(err.Error(), expected) {
			t.Fatalf("schema error %q does not contain %q", err, expected)
		}
	}
}
