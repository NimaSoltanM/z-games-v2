// Package credentialstate centralizes the ownership rule for delivered account
// credentials. A credential is active while a customer still holds the delivered
// order item. Approved and permanently refused returns are terminal: the original
// customer no longer owns that account, so those source rows must not trigger a
// duplicate-delivery warning.
package credentialstate

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/soltanmohammdi/z-games/internal/shared/credentials"
)

// queryer is implemented by both pgx.Tx and pgxpool.Pool.
type queryer interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

// Holder identifies an order item whose customer still owns an account.
type Holder struct {
	ItemID      string
	OrderID     string
	OrderNumber int64
	GameName    string
	Console     string
	Capacity    string
}

// FulfillmentAdvisoryLockKey serializes credential ownership changes. Duplicate
// checks and inventory toggles must hold this transaction-level lock so two admin
// requests cannot both observe an account as free and assign it concurrently.
const FulfillmentAdvisoryLockKey int64 = 8_904_221_731

// NormalizeAccountID normalizes the login identifier portion of account identity.
// Console account emails are case-insensitive; passwords and passcodes may change.
func NormalizeAccountID(value string) string {
	return strings.ToLower(strings.TrimSpace(value))
}

// PlatformFamily groups console generations that share the same account system.
// Unknown/future platform codes form their own family automatically, so adding a
// platform never causes its logins to collide with an existing ecosystem.
func PlatformFamily(platform string) string {
	p := strings.ToLower(strings.TrimSpace(platform))
	if strings.HasPrefix(p, "playstation") || isPlayStationCode(p) {
		return "playstation"
	}
	if separator := strings.IndexByte(p, '_'); separator > 0 {
		return p[:separator]
	}
	return p
}

func isPlayStationCode(platform string) bool {
	if !strings.HasPrefix(platform, "ps") || len(platform) == 2 {
		return false
	}
	for _, r := range platform[2:] {
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}

// AccountIdentity scopes a normalized login to its account ecosystem. The same
// email can legitimately identify unrelated PlayStation, Xbox, and Steam
// accounts, while PS4/PS5 and Xbox generations share an identity namespace.
func AccountIdentity(email, platform string) string {
	return PlatformFamily(platform) + "\x00" + NormalizeAccountID(email)
}

// ActiveHolders returns active delivered items grouped by normalized account
// identity. Only identities in wanted are returned. excludedItemIDs represent
// items whose final values are being replaced in the current fulfillment request,
// so their old database values must not create stale warnings.
func ActiveHolders(ctx context.Context, db queryer, cipher *credentials.Cipher, wanted map[string]struct{}, excludedItemIDs map[string]struct{}) (map[string][]Holder, error) {
	out := make(map[string][]Holder)
	if len(wanted) == 0 {
		return out, nil
	}

	rows, err := db.Query(ctx, `
		SELECT oi.id, oi.email, o.id, o.order_number, oi.game_name, oi.platform, oi.zarfiat
		FROM order_items oi
		JOIN orders o ON o.id = oi.order_id
		LEFT JOIN game_returns gr ON gr.order_item_id = oi.id
		WHERE o.status IN ('paid', 'fulfilled')
		  AND oi.email IS NOT NULL
		  AND oi.password IS NOT NULL
		  AND oi.passcode IS NOT NULL
		  AND (gr.id IS NULL OR gr.status NOT IN ('approved', 'refused'))
		ORDER BY o.created_at DESC, oi.id
	`)
	if err != nil {
		return nil, fmt.Errorf("credentialstate active holders: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var (
			holder         Holder
			encryptedEmail *string
		)
		if err := rows.Scan(&holder.ItemID, &encryptedEmail, &holder.OrderID, &holder.OrderNumber,
			&holder.GameName, &holder.Console, &holder.Capacity); err != nil {
			return nil, fmt.Errorf("credentialstate active holders scan: %w", err)
		}
		if _, excluded := excludedItemIDs[holder.ItemID]; excluded {
			continue
		}
		email, err := cipher.DecryptPtr(encryptedEmail)
		if err != nil {
			return nil, fmt.Errorf("credentialstate decrypt email: %w", err)
		}
		if email == nil {
			continue
		}
		identity := AccountIdentity(*email, holder.Console)
		if _, ok := wanted[identity]; ok {
			out[identity] = append(out[identity], holder)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("credentialstate active holders rows: %w", err)
	}
	return out, nil
}
