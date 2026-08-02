package users

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type userRow struct {
	Phone     string    `json:"phone"`
	FirstName *string   `json:"first_name"`
	LastName  *string   `json:"last_name"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

func listUsers(ctx context.Context, db *pgxpool.Pool, limit, offset int) ([]userRow, int, error) {
	var total int
	if err := db.QueryRow(ctx, "SELECT COUNT(*) FROM users").Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("listUsers count: %w", err)
	}

	rows, err := db.Query(ctx, `
		SELECT phone, first_name, last_name, role, created_at
		FROM users
		ORDER BY created_at DESC, id DESC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("listUsers query: %w", err)
	}
	defer rows.Close()

	users := []userRow{}
	for rows.Next() {
		var user userRow
		if err := rows.Scan(
			&user.Phone,
			&user.FirstName,
			&user.LastName,
			&user.Role,
			&user.CreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("listUsers scan: %w", err)
		}
		users = append(users, user)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("listUsers rows: %w", err)
	}
	return users, total, nil
}
