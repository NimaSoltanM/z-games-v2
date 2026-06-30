package orders

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// MinGatewayToman is ZarinPal's minimum chargeable amount (Toman). When applying
// the wallet would leave a gateway remainder smaller than this, splitWallet holds
// back a little wallet so the remainder is chargeable.
const MinGatewayToman = 1000

// splitWallet decides how much of a `total` (Toman) is paid from a wallet balance
// and how much is left for the gateway. It applies the whole balance, with one
// guard: if that would leave a non-zero gateway remainder below MinGatewayToman,
// it un-applies just enough wallet to lift the remainder to the minimum (so
// ZarinPal can charge it) — provided there's wallet to give back.
func splitWallet(balance, total int) (walletApplied, gateway int) {
	if balance < 0 {
		balance = 0
	}
	walletApplied = min(balance, total)
	gateway = total - walletApplied
	if gateway > 0 && gateway < MinGatewayToman {
		reduce := min(MinGatewayToman-gateway, walletApplied)
		walletApplied -= reduce
		gateway = total - walletApplied
	}
	return walletApplied, gateway
}

func userWalletBalance(ctx context.Context, db *pgxpool.Pool, userID string) (int, error) {
	var bal int
	if err := db.QueryRow(ctx, "SELECT wallet_balance FROM users WHERE id = $1", userID).Scan(&bal); err != nil {
		return 0, fmt.Errorf("userWalletBalance: %w", err)
	}
	return bal, nil
}

// WalletTxn is one ledger entry shown on the dashboard. Amount is signed Toman
// (positive = credited, negative = spent).
type WalletTxn struct {
	Amount    int       `json:"amount"`
	Reason    string    `json:"reason"`
	CreatedAt time.Time `json:"created_at"`
}

type WalletView struct {
	Balance      int         `json:"balance"`
	Transactions []WalletTxn `json:"transactions"`
}

// getWallet returns the user's current balance and their most recent ledger rows.
func getWallet(ctx context.Context, db *pgxpool.Pool, userID string) (WalletView, error) {
	w := WalletView{Transactions: []WalletTxn{}}
	if err := db.QueryRow(ctx, "SELECT wallet_balance FROM users WHERE id = $1", userID).Scan(&w.Balance); err != nil {
		return w, fmt.Errorf("getWallet balance: %w", err)
	}
	rows, err := db.Query(ctx, `
		SELECT amount, reason, created_at FROM wallet_transactions
		WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50
	`, userID)
	if err != nil {
		return w, fmt.Errorf("getWallet txns: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var t WalletTxn
		if err := rows.Scan(&t.Amount, &t.Reason, &t.CreatedAt); err != nil {
			return w, fmt.Errorf("getWallet scan: %w", err)
		}
		w.Transactions = append(w.Transactions, t)
	}
	return w, rows.Err()
}
