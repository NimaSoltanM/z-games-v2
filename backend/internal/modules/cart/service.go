package cart

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// execer is satisfied by both *pgxpool.Pool and pgx.Tx, so the same upsert
// works for a standalone call and inside a merge transaction.
type execer interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

type CartItemRow struct {
	ID         string
	GameID     string
	GameName   string
	CoverImage *string
	Platform   string
	Zarfiat    string
	Quantity   int
}

func getCartItems(ctx context.Context, db *pgxpool.Pool, userID string) ([]CartItemRow, error) {
	rows, err := db.Query(ctx, `
		SELECT ci.id, ci.game_id, g.name, g.cover_image, ci.platform, ci.zarfiat, ci.quantity
		FROM cart_items ci
		JOIN games g ON g.id = ci.game_id
		WHERE ci.user_id = $1
		ORDER BY ci.created_at ASC
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("getCartItems: %w", err)
	}
	defer rows.Close()

	var items []CartItemRow
	for rows.Next() {
		var item CartItemRow
		if err := rows.Scan(&item.ID, &item.GameID, &item.GameName, &item.CoverImage,
			&item.Platform, &item.Zarfiat, &item.Quantity); err != nil {
			return nil, fmt.Errorf("getCartItems scan: %w", err)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

type upsertInput struct {
	GameID   string
	Platform string
	Zarfiat  string
	Quantity int
}

func upsertCartItem(ctx context.Context, db execer, userID string, in upsertInput) error {
	// LEAST(..., 10) on both the insert and the conflict path so quantity can
	// never exceed the cap regardless of caller (the DB CHECK is the backstop).
	_, err := db.Exec(ctx, `
		INSERT INTO cart_items (user_id, game_id, platform, zarfiat, quantity)
		VALUES ($1, $2, $3, $4, LEAST($5, 10))
		ON CONFLICT (user_id, game_id, platform, zarfiat)
		DO UPDATE SET quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, 10)
	`, userID, in.GameID, in.Platform, in.Zarfiat, in.Quantity)
	return err
}

func setCartItemQty(ctx context.Context, db *pgxpool.Pool, userID, gameID, platform, zarfiat string, qty int) error {
	if qty <= 0 {
		return deleteCartItem(ctx, db, userID, gameID, platform, zarfiat)
	}
	_, err := db.Exec(ctx, `
		UPDATE cart_items SET quantity = $1
		WHERE user_id = $2 AND game_id = $3 AND platform = $4 AND zarfiat = $5
	`, qty, userID, gameID, platform, zarfiat)
	return err
}

func deleteCartItem(ctx context.Context, db *pgxpool.Pool, userID, gameID, platform, zarfiat string) error {
	_, err := db.Exec(ctx, `
		DELETE FROM cart_items
		WHERE user_id = $1 AND game_id = $2 AND platform = $3 AND zarfiat = $4
	`, userID, gameID, platform, zarfiat)
	return err
}

func clearCartItems(ctx context.Context, db *pgxpool.Pool, userID string) error {
	_, err := db.Exec(ctx, `DELETE FROM cart_items WHERE user_id = $1`, userID)
	return err
}

type mergeItem struct {
	GameID   string
	Platform string
	Zarfiat  string
	Quantity int
}

// isDataConstraintError returns true for DB errors that mean "this item is invalid data"
// (game deleted, invalid console/capacity) — these should be skipped silently during
// merge. Infrastructure errors (DB down, network) are NOT data constraint errors and
// must propagate.
func isDataConstraintError(err error) bool {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23503", // foreign_key_violation: game, or console/capacity, doesn't exist
			"23514": // check_violation: quantity out of range
			return true
		}
	}
	return false
}

// mergeCart upserts anonymous cart items into the user's server cart.
//
// The whole merge runs in one transaction so it is atomic: if an infrastructure
// error occurs partway through, everything rolls back and nothing is persisted.
// That keeps the operation safe to retry — a retry always runs against the
// original cart state instead of double-counting already-merged quantities.
//
// Individual items that fail on a data constraint (game deleted, invalid
// platform/zarfiat) are skipped via a per-item savepoint, so one bad item never
// aborts the rest of the merge.
func mergeCart(ctx context.Context, db *pgxpool.Pool, userID string, items []mergeItem) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return fmt.Errorf("mergeCart begin: %w", err)
	}
	defer tx.Rollback(ctx)

	for _, item := range items {
		if item.Quantity <= 0 {
			continue
		}

		// Per-item savepoint: a data-constraint failure rolls back only this
		// item, leaving the outer transaction usable for the remaining items.
		sp, err := tx.Begin(ctx)
		if err != nil {
			return fmt.Errorf("mergeCart savepoint: %w", err)
		}

		err = upsertCartItem(ctx, sp, userID, upsertInput{
			GameID:   item.GameID,
			Platform: item.Platform,
			Zarfiat:  item.Zarfiat,
			Quantity: item.Quantity,
		})
		if err != nil {
			_ = sp.Rollback(ctx)
			if isDataConstraintError(err) {
				continue
			}
			return fmt.Errorf("mergeCart: %w", err)
		}
		if err := sp.Commit(ctx); err != nil {
			return fmt.Errorf("mergeCart savepoint commit: %w", err)
		}
	}

	return tx.Commit(ctx)
}
