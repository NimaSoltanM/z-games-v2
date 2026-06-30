// Package credentials encrypts delivered account credentials (email/password/
// passcode) at rest with AES-256-GCM. These are the product we sell, so a DB dump
// must never expose them in cleartext. The key comes from CREDENTIALS_KEY
// (base64-encoded, 32 bytes) and must be stored outside the database and its
// backups — otherwise the encryption protects nothing.
//
// It lives in a shared package because more than one module needs it: orders
// writes credentials at fulfillment, and returns reads them back for an admin
// reviewing a buy-back request.
package credentials

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
)

// Cipher seals and opens credential values with a single AES-256-GCM key.
type Cipher struct {
	aead cipher.AEAD
}

// New builds a Cipher from a base64-encoded 32-byte key.
func New(base64Key string) (*Cipher, error) {
	key, err := base64.StdEncoding.DecodeString(base64Key)
	if err != nil {
		return nil, fmt.Errorf("CREDENTIALS_KEY: invalid base64: %w", err)
	}
	if len(key) != 32 {
		return nil, fmt.Errorf("CREDENTIALS_KEY must decode to 32 bytes for AES-256 (got %d)", len(key))
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("new aes cipher: %w", err)
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("new gcm: %w", err)
	}
	return &Cipher{aead: aead}, nil
}

// EncryptNullable returns base64(nonce‖ciphertext) for a non-empty value, or nil
// for an empty one so the column is stored as SQL NULL (which the fulfillment
// completeness check relies on).
func (c *Cipher) EncryptNullable(plaintext string) (any, error) {
	if plaintext == "" {
		return nil, nil
	}
	nonce := make([]byte, c.aead.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("credential nonce: %w", err)
	}
	sealed := c.aead.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(sealed), nil
}

// Decrypt reverses EncryptNullable. An empty input maps to an empty output.
func (c *Cipher) Decrypt(encoded string) (string, error) {
	if encoded == "" {
		return "", nil
	}
	raw, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", fmt.Errorf("credential decode: %w", err)
	}
	ns := c.aead.NonceSize()
	if len(raw) < ns {
		return "", errors.New("credential ciphertext too short")
	}
	nonce, ciphertext := raw[:ns], raw[ns:]
	plaintext, err := c.aead.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("credential decrypt: %w", err)
	}
	return string(plaintext), nil
}

// DecryptPtr decrypts a nullable column in place: NULL stays NULL.
func (c *Cipher) DecryptPtr(enc *string) (*string, error) {
	if enc == nil {
		return nil, nil
	}
	dec, err := c.Decrypt(*enc)
	if err != nil {
		return nil, err
	}
	return &dec, nil
}
