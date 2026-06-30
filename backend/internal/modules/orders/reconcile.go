package orders

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	reconcileInterval = 5 * time.Minute
	// reconcileStale is how old a pending order must be before we resolve it.
	// It's well past ZarinPal's payment-session window, so a buyer can no longer be
	// mid-payment — a "not paid" verify is then final and safe to fail+refund.
	reconcileStale = 30 * time.Minute
	reconcileBatch = 50
)

// verifier is the slice of the ZarinPal client the reconciler needs, so it can be
// faked in tests. *zarinpalClient satisfies it.
type verifier interface {
	verifyPayment(ctx context.Context, amount int, authority string) (int64, error)
}

// startReconciler periodically settles stale pending orders. Without it, a buyer
// who reserves wallet credit at checkout and then abandons the gateway (so the
// callback never fires) would strand that credit in a forever-pending order. It
// also rescues genuine payments whose callback was lost.
func startReconciler(db *pgxpool.Pool, v verifier) {
	go func() {
		ticker := time.NewTicker(reconcileInterval)
		defer ticker.Stop()
		for range ticker.C {
			n, err := reconcilePendingOrders(context.Background(), db, v, reconcileStale)
			if err != nil {
				log.Printf("orders: reconcile failed: %v", err)
			} else if n > 0 {
				log.Printf("orders: reconciled %d stale pending order(s)", n)
			}
		}
	}()
}

// reconcilePendingOrders re-checks each pending order older than staleAfter and
// settles it: verified -> paid; definitively not paid, or never sent to the gateway
// -> failed + reserved wallet refunded; ambiguous/unknown -> left pending for manual
// review. markOrderPaid and failOrder are both guarded on status='pending', so this
// races safely with a late real callback (whichever settles first wins; the other
// is a no-op). Returns how many orders it resolved.
func reconcilePendingOrders(ctx context.Context, db *pgxpool.Pool, v verifier, staleAfter time.Duration) (int, error) {
	cutoff := time.Now().Add(-staleAfter)
	rows, err := db.Query(ctx, `
		SELECT id, COALESCE(authority, ''), amount - wallet_applied
		FROM orders
		WHERE status = 'pending' AND created_at < $1
		ORDER BY created_at ASC
		LIMIT $2
	`, cutoff, reconcileBatch)
	if err != nil {
		return 0, fmt.Errorf("reconcilePendingOrders query: %w", err)
	}
	type pend struct {
		id, authority string
		gateway       int
	}
	var pending []pend
	for rows.Next() {
		var p pend
		if err := rows.Scan(&p.id, &p.authority, &p.gateway); err != nil {
			rows.Close()
			return 0, fmt.Errorf("reconcilePendingOrders scan: %w", err)
		}
		pending = append(pending, p)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return 0, fmt.Errorf("reconcilePendingOrders rows: %w", err)
	}

	resolved := 0
	for _, p := range pending {
		// No authority means the gateway session was never started, so the buyer
		// could not have paid — safe to fail and refund the reserved wallet.
		if p.authority == "" {
			if err := failOrder(ctx, db, p.id); err != nil {
				log.Printf("orders: reconcile fail (no authority) order %s: %v", p.id, err)
				continue
			}
			resolved++
			continue
		}

		refID, err := v.verifyPayment(ctx, p.gateway, p.authority)
		switch {
		case err == nil:
			// Actually paid (lost callback). Settle it; don't touch the cart this late.
			if _, e := markOrderPaid(ctx, db, p.id, refID); e != nil {
				log.Printf("orders: reconcile markPaid order %s: %v", p.id, e)
				continue
			}
			resolved++
		case errors.Is(err, ErrPaymentNotVerified):
			if e := failOrder(ctx, db, p.id); e != nil {
				log.Printf("orders: reconcile fail order %s: %v", p.id, e)
				continue
			}
			resolved++
		default:
			// UNKNOWN (transport/timeout/-52): leave pending for manual reconcile.
		}
	}
	return resolved, nil
}
