package orders

import (
	"crypto/rand"
	"encoding/base64"
	"testing"

	"github.com/soltanmohammdi/z-games/internal/shared/credentials"
)

// newTestCipher builds a throwaway credential cipher for tests. The cipher's own
// round-trip/tamper coverage lives in the credentials package; here it just seeds
// the orders integration test with a working cipher.
func newTestCipher(t *testing.T) *credentials.Cipher {
	t.Helper()
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		t.Fatal(err)
	}
	c, err := credentials.New(base64.StdEncoding.EncodeToString(key))
	if err != nil {
		t.Fatalf("credentials.New: %v", err)
	}
	return c
}
