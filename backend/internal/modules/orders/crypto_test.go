package orders

import (
	"crypto/rand"
	"encoding/base64"
	"testing"
)

func newTestCipher(t *testing.T) *credCipher {
	t.Helper()
	key := make([]byte, 32)
	if _, err := rand.Read(key); err != nil {
		t.Fatal(err)
	}
	c, err := newCredCipher(base64.StdEncoding.EncodeToString(key))
	if err != nil {
		t.Fatalf("newCredCipher: %v", err)
	}
	return c
}

func TestCredCipher_RoundTrip(t *testing.T) {
	c := newTestCipher(t)
	plain := "p@ssw0rd! آزمایش 🎮"

	enc, err := c.encryptNullable(plain)
	if err != nil {
		t.Fatal(err)
	}
	s, ok := enc.(string)
	if !ok {
		t.Fatalf("encryptNullable returned %T, want string", enc)
	}
	if s == plain {
		t.Fatal("stored value equals plaintext — not encrypted")
	}

	dec, err := c.decrypt(s)
	if err != nil {
		t.Fatal(err)
	}
	if dec != plain {
		t.Fatalf("round-trip = %q, want %q", dec, plain)
	}
}

func TestCredCipher_EmptyEncryptsToNil(t *testing.T) {
	c := newTestCipher(t)
	enc, err := c.encryptNullable("")
	if err != nil {
		t.Fatal(err)
	}
	if enc != nil {
		t.Fatalf("empty must encrypt to nil (SQL NULL), got %v", enc)
	}
}

func TestCredCipher_NonceIsRandom(t *testing.T) {
	c := newTestCipher(t)
	a, _ := c.encryptNullable("same")
	b, _ := c.encryptNullable("same")
	if a.(string) == b.(string) {
		t.Fatal("same plaintext produced identical ciphertext — nonce not random")
	}
}

func TestCredCipher_WrongKeyFails(t *testing.T) {
	enc, _ := newTestCipher(t).encryptNullable("secret")
	if _, err := newTestCipher(t).decrypt(enc.(string)); err == nil {
		t.Fatal("decrypt with a different key must fail")
	}
}

func TestCredCipher_TamperFails(t *testing.T) {
	c := newTestCipher(t)
	enc, _ := c.encryptNullable("secret")
	raw, _ := base64.StdEncoding.DecodeString(enc.(string))
	raw[len(raw)-1] ^= 0xFF // flip a bit in the ciphertext/tag
	if _, err := c.decrypt(base64.StdEncoding.EncodeToString(raw)); err == nil {
		t.Fatal("GCM must reject tampered ciphertext")
	}
}

func TestCredCipher_DecryptPtrNilStaysNil(t *testing.T) {
	got, err := newTestCipher(t).decryptPtr(nil)
	if err != nil || got != nil {
		t.Fatalf("nil pointer must stay nil, got %v err %v", got, err)
	}
}

func TestNewCredCipher_RejectsBadKeys(t *testing.T) {
	if _, err := newCredCipher("not valid base64 @@@"); err == nil {
		t.Error("invalid base64 must error")
	}
	if _, err := newCredCipher(base64.StdEncoding.EncodeToString(make([]byte, 16))); err == nil {
		t.Error("16-byte key must error (AES-256 needs 32)")
	}
	if _, err := newCredCipher(""); err == nil {
		t.Error("empty key must error")
	}
}
