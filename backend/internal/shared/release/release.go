// Package release holds the single source of truth for a game's pre-order
// lifecycle: given a game's stored release status and (optional) expected
// release date, it derives the phase the storefront and order flow act on.
// Both the games and orders modules use it so the rules never drift apart.
package release

import "time"

// Stored release_status values on a game.
const (
	StatusReleased = "released"
	StatusPreOrder = "pre_order"
)

// Derived phases returned to callers (and the frontend).
const (
	// PhaseReleased: normal storefront behaviour — purchasable, credentials
	// delivered the usual way. A pre-order game flips here automatically once its
	// release date arrives, or when an admin sets status to released.
	PhaseReleased = "released"
	// PhasePreOrder: taking pre-orders — purchasable, but credentials are only
	// delivered after the game officially releases.
	PhasePreOrder = "pre_order"
	// PhaseClosingSoon: the game is about to release (within CloseBuffer of the
	// release date) but isn't out yet. Pre-order sales are closed and normal sales
	// haven't started, so there is no purchase option in this window.
	PhaseClosingSoon = "closing_soon"
)

// CloseBuffer is how long before the release date pre-order sales stop. Tunable
// if a title needs a wider window; one day is the default.
const CloseBuffer = 24 * time.Hour

// Phase derives the lifecycle phase from a game's stored status and release date.
// A nil releaseDate on a pre-order means "no date set yet" — still taking
// pre-orders, with no countdown and no automatic close.
func Phase(status string, releaseDate *time.Time, now time.Time) string {
	if status != StatusPreOrder {
		return PhaseReleased
	}
	if releaseDate == nil {
		return PhasePreOrder
	}
	if !now.Before(*releaseDate) {
		return PhaseReleased // release date reached or passed → behaves as released
	}
	if !now.Before(releaseDate.Add(-CloseBuffer)) {
		return PhaseClosingSoon // inside the pre-release closing window
	}
	return PhasePreOrder
}

// Purchasable reports whether a game in the given phase can be added to a cart /
// checked out. The closing window is the only phase with no purchase option.
func Purchasable(phase string) bool {
	return phase == PhaseReleased || phase == PhasePreOrder
}
