package games

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/soltanmohammdi/z-games/internal/testdb"
)

// latestUpdateMeta returns the metadata of the most recent game.update audit row.
func latestUpdateMeta(t *testing.T, ctx context.Context, db *pgxpool.Pool, gameID string) map[string]any {
	t.Helper()
	var raw []byte
	err := db.QueryRow(ctx, `
		SELECT metadata FROM admin_actions
		WHERE action = 'game.update' AND target_id = $1
		ORDER BY created_at DESC LIMIT 1
	`, gameID).Scan(&raw)
	if err != nil {
		t.Fatalf("load update audit row: %v", err)
	}
	var m map[string]any
	if err := json.Unmarshal(raw, &m); err != nil {
		t.Fatalf("unmarshal metadata: %v", err)
	}
	return m
}

func fromTo(t *testing.T, changes map[string]any, field string) (any, any) {
	t.Helper()
	c, ok := changes[field].(map[string]any)
	if !ok {
		t.Fatalf("expected a %q change, got: %v", field, changes[field])
	}
	return c["from"], c["to"]
}

func TestUpdateGame_AuditRecordsDiff(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	id, err := createGame(ctx, db, "a1", normalizedGame{
		Name: "GTA V", Platform: "ps5", PriceMode: "dynamic", Active: true,
		BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 5}},
	})
	if err != nil {
		t.Fatal(err)
	}

	// Disable it, rename it, and drop the base price 5 -> 4 in one edit.
	if err := updateGame(ctx, db, "a1", id, normalizedGame{
		Name: "GTA 5", Platform: "ps5", PriceMode: "dynamic", Active: false,
		BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 4}},
	}); err != nil {
		t.Fatal(err)
	}

	meta := latestUpdateMeta(t, ctx, db, id)

	// Name is denormalized onto the row so the feed reads naturally.
	if meta["name"] != "GTA 5" {
		t.Fatalf("meta.name = %v, want \"GTA 5\"", meta["name"])
	}

	changes, ok := meta["changes"].(map[string]any)
	if !ok {
		t.Fatalf("meta.changes missing or wrong type: %v", meta["changes"])
	}

	// active: true -> false (the "disable" case)
	if from, to := fromTo(t, changes, "active"); from != true || to != false {
		t.Fatalf("active change = %v -> %v, want true -> false", from, to)
	}
	// name: "GTA V" -> "GTA 5"
	if from, to := fromTo(t, changes, "name"); from != "GTA V" || to != "GTA 5" {
		t.Fatalf("name change = %v -> %v", from, to)
	}

	// price_changes: ps5 base_usd 5 -> 4 (JSON numbers decode as float64)
	pcs, ok := meta["price_changes"].([]any)
	if !ok || len(pcs) != 1 {
		t.Fatalf("price_changes = %v, want one entry", meta["price_changes"])
	}
	pc := pcs[0].(map[string]any)
	if pc["platform"] != "ps5" || pc["kind"] != "base_usd" || pc["from"] != float64(5) || pc["to"] != float64(4) {
		t.Fatalf("price change = %v, want ps5 base_usd 5 -> 4", pc)
	}
}

func TestUpdateGame_AuditNoChange(t *testing.T) {
	ctx := context.Background()
	db := testdb.New(t)
	seedAdmin(t, ctx, db, "a1")

	in := normalizedGame{
		Name: "Stable", Platform: "ps5", PriceMode: "dynamic", Active: true,
		BasePrices: []normalizedBasePrice{{Platform: "ps5", BaseUSD: 5}},
	}
	id, err := createGame(ctx, db, "a1", in)
	if err != nil {
		t.Fatal(err)
	}
	// Re-save identical data: the row is still logged, with an empty change set.
	if err := updateGame(ctx, db, "a1", id, in); err != nil {
		t.Fatal(err)
	}

	meta := latestUpdateMeta(t, ctx, db, id)
	changes, ok := meta["changes"].(map[string]any)
	if !ok {
		t.Fatalf("meta.changes missing: %v", meta)
	}
	if len(changes) != 0 {
		t.Fatalf("expected no field changes, got: %v", changes)
	}
	if _, present := meta["price_changes"]; present {
		t.Fatalf("expected no price_changes key, got: %v", meta["price_changes"])
	}
}
