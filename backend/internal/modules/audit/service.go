// Package audit (module) is the read side of the admin action log: it lists the
// rows that internal/shared/audit writes. Kept separate from that shared writer
// so the HTTP/query concerns live with the other feature modules.
package audit

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ActionRow is one logged admin action, joined to the admin's name/phone for
// display. Metadata is passed through as raw JSON.
type ActionRow struct {
	ID         string          `json:"id"`
	AdminID    string          `json:"admin_id"`
	AdminName  string          `json:"admin_name"`
	AdminPhone string          `json:"admin_phone"`
	Action     string          `json:"action"`
	TargetType *string         `json:"target_type"`
	TargetID   *string         `json:"target_id"`
	Metadata   json.RawMessage `json:"metadata"`
	CreatedAt  time.Time       `json:"created_at"`
}

// Actor is an admin who appears in the log, for the "filter by admin" dropdown.
type Actor struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Phone string `json:"phone"`
}

type listFilters struct {
	AdminID string
	Action  string
}

// listActions returns a newest-first page of actions plus the total count, with
// optional admin and action filters.
func listActions(ctx context.Context, db *pgxpool.Pool, f listFilters, limit, offset int) ([]ActionRow, int, error) {
	var where []string
	var args []any
	n := 1
	if f.AdminID != "" {
		where = append(where, fmt.Sprintf("a.admin_id = $%d", n))
		args = append(args, f.AdminID)
		n++
	}
	if f.Action != "" {
		where = append(where, fmt.Sprintf("a.action = $%d", n))
		args = append(args, f.Action)
		n++
	}
	clause := ""
	if len(where) > 0 {
		clause = "WHERE " + strings.Join(where, " AND ")
	}

	var total int
	if err := db.QueryRow(ctx, "SELECT COUNT(*) FROM admin_actions a "+clause, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("listActions count: %w", err)
	}

	q := fmt.Sprintf(`
		SELECT a.id, a.admin_id,
		       TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS admin_name,
		       COALESCE(u.phone, '') AS admin_phone,
		       a.action, a.target_type, a.target_id, a.metadata, a.created_at
		FROM admin_actions a
		LEFT JOIN users u ON u.id = a.admin_id
		%s
		ORDER BY a.created_at DESC, a.id DESC
		LIMIT $%d OFFSET $%d
	`, clause, n, n+1)
	args = append(args, limit, offset)

	rows, err := db.Query(ctx, q, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("listActions query: %w", err)
	}
	defer rows.Close()

	actions := []ActionRow{}
	for rows.Next() {
		var r ActionRow
		var meta []byte
		if err := rows.Scan(&r.ID, &r.AdminID, &r.AdminName, &r.AdminPhone,
			&r.Action, &r.TargetType, &r.TargetID, &meta, &r.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("listActions scan: %w", err)
		}
		r.Metadata = json.RawMessage(meta)
		actions = append(actions, r)
	}
	return actions, total, rows.Err()
}

// listActors returns the distinct admins that have at least one logged action,
// ordered by display name.
func listActors(ctx context.Context, db *pgxpool.Pool) ([]Actor, error) {
	rows, err := db.Query(ctx, `
		SELECT DISTINCT a.admin_id,
		       TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS name,
		       COALESCE(u.phone, '') AS phone
		FROM admin_actions a
		LEFT JOIN users u ON u.id = a.admin_id
		ORDER BY name
	`)
	if err != nil {
		return nil, fmt.Errorf("listActors query: %w", err)
	}
	defer rows.Close()

	actors := []Actor{}
	for rows.Next() {
		var a Actor
		if err := rows.Scan(&a.ID, &a.Name, &a.Phone); err != nil {
			return nil, fmt.Errorf("listActors scan: %w", err)
		}
		actors = append(actors, a)
	}
	return actors, rows.Err()
}
