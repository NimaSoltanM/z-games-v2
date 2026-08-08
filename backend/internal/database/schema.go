package database

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

const latestMigration = "021_operational_retention.sql"

// ValidateSchema prevents an application binary from starting against a
// database that has not received the migrations its queries depend on. Keep the
// required objects in step with every migration that changes the runtime schema.
func ValidateSchema(ctx context.Context, db *pgxpool.Pool) error {
	rows, err := db.Query(ctx, `
		WITH required(table_name, column_name) AS (
			VALUES
				('games', 'description_markdown'),
				('games', 'seo_title'),
				('games', 'seo_description'),
				('game_returns', 'inventory_disabled_at'),
				('game_returns', 'inventory_disabled_by'),
				('orders', 'checkout_fingerprint'),
				('verification_code_requests', 'id'),
				('verification_code_requests', 'order_item_id'),
				('verification_code_requests', 'user_id'),
				('verification_code_requests', 'status'),
				('verification_code_requests', 'code'),
				('verification_code_requests', 'requested_at'),
				('verification_code_requests', 'delivered_at'),
				('verification_code_requests', 'expires_at'),
				('verification_code_requests', 'delivered_by'),
				('verification_code_requests', 'updated_at')
		)
		SELECT required.table_name || '.' || required.column_name
		FROM required
		WHERE NOT EXISTS (
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = 'public'
			  AND table_name = required.table_name
			  AND column_name = required.column_name
		)
		UNION ALL
		SELECT 'user_role.super_admin'
		WHERE NOT EXISTS (
			SELECT 1
			FROM pg_type
			JOIN pg_enum ON pg_enum.enumtypid = pg_type.oid
			WHERE pg_type.typname = 'user_role'
			  AND pg_enum.enumlabel = 'super_admin'
		)
		UNION ALL
		SELECT required_index
		FROM (VALUES
			('otp_codes_phone_created_idx'),
			('otp_codes_cleanup_idx'),
			('orders_one_pending_checkout_idx'),
			('orders_user_created_idx'),
			('orders_pending_reconcile_idx')
		) indexes(required_index)
		WHERE to_regclass('public.' || required_index) IS NULL
		UNION ALL
		SELECT 'otp_codes_secret_lifecycle_check'
		WHERE NOT EXISTS (
			SELECT 1
			FROM pg_constraint
			WHERE conname = 'otp_codes_secret_lifecycle_check'
			  AND conrelid = 'public.otp_codes'::regclass
		)
		ORDER BY 1
	`)
	if err != nil {
		return fmt.Errorf("inspect database schema: %w", err)
	}
	defer rows.Close()

	missing := make([]string, 0)
	for rows.Next() {
		var object string
		if err := rows.Scan(&object); err != nil {
			return fmt.Errorf("scan missing database object: %w", err)
		}
		missing = append(missing, object)
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("inspect database schema rows: %w", err)
	}
	if len(missing) > 0 {
		return fmt.Errorf(
			"database schema is outdated; missing %s; apply migrations through %s",
			strings.Join(missing, ", "),
			latestMigration,
		)
	}

	return nil
}
