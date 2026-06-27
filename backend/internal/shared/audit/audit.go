// Package audit records privileged admin actions to an append-only log so every
// action is attributable to an admin with a timestamp. Record works with either
// a pool or a transaction, so callers can log atomically alongside the action.
package audit

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/jackc/pgx/v5/pgconn"
)

// Action keys. Add new ones here as new admin actions are built.
const (
	ActionOrderFulfill = "order.fulfill"
	ActionGamePreorder = "game.preorder"
	ActionGameAlert    = "game.alert"
	ActionImageUpload  = "image.upload"
	ActionGameCreate   = "game.create"
	ActionGameUpdate   = "game.update"
	ActionGameDelete   = "game.delete"
	ActionGameDiscount = "game.discount"
	ActionExchangeRate = "exchange_rate.set"
)

// execer is satisfied by both *pgxpool.Pool and pgx.Tx.
type execer interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

// Entry is a single audited action.
type Entry struct {
	AdminID    string         // user id of the admin who performed it (required)
	Action     string         // e.g. ActionOrderFulfill (required)
	TargetType string         // e.g. "order" (optional)
	TargetID   string         // affected entity id (optional)
	Metadata   map[string]any // action-specific details, stored as JSONB (optional)
}

// Record writes one audit row. Pass a transaction as db to make the log atomic
// with the action it describes.
func Record(ctx context.Context, db execer, e Entry) error {
	if e.AdminID == "" || e.Action == "" {
		return fmt.Errorf("audit: AdminID and Action are required")
	}

	var meta any
	if len(e.Metadata) > 0 {
		b, err := json.Marshal(e.Metadata)
		if err != nil {
			return fmt.Errorf("audit: marshal metadata: %w", err)
		}
		meta = string(b)
	}

	_, err := db.Exec(ctx, `
		INSERT INTO admin_actions (admin_id, action, target_type, target_id, metadata)
		VALUES ($1, $2, $3, $4, $5::jsonb)
	`, e.AdminID, e.Action, nullable(e.TargetType), nullable(e.TargetID), meta)
	if err != nil {
		return fmt.Errorf("audit: record %q: %w", e.Action, err)
	}
	return nil
}

func nullable(s string) any {
	if s == "" {
		return nil
	}
	return s
}
