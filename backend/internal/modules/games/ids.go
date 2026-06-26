package games

import "crypto/rand"

// idAlphabet is lowercase base36, matching the existing game/link id style.
const idAlphabet = "0123456789abcdefghijklmnopqrstuvwxyz"

// newID returns a 24-character random base36 identifier for a game or link
// (game_prices use a DB-side UUID default instead). It uses rejection sampling so
// the distribution is uniform with no modulo bias.
func newID() (string, error) {
	const n = 24
	// 252 = 256 - (256 % 36); bytes >= 252 would bias the modulo, so reject them.
	const limit = 252

	out := make([]byte, n)
	buf := make([]byte, n)
	i := 0
	for i < n {
		if _, err := rand.Read(buf); err != nil {
			return "", err
		}
		for _, b := range buf {
			if int(b) >= limit {
				continue
			}
			out[i] = idAlphabet[int(b)%len(idAlphabet)]
			i++
			if i == n {
				break
			}
		}
	}
	return string(out), nil
}
