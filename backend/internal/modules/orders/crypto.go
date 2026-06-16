package orders

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
)

// credCipher encrypts delivered PlayStation account credentials (email/password/
// psn_pass) at rest with AES-256-GCM. These are the product we sell, so a DB
// dump must never expose them in cleartext. The key comes from CREDENTIALS_KEY
// (base64-encoded, 32 bytes) and must be stored outside the database and its
// backups — otherwise the encryption protects nothing.
type credCipher struct {
	aead cipher.AEAD
}

func newCredCipher(base64Key string) (*credCipher, error) {
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
	return &credCipher{aead: aead}, nil
}

// encryptNullable returns base64(nonce‖ciphertext) for a non-empty value, or nil
// for an empty one so the column is stored as SQL NULL (which the fulfillment
// completeness check relies on).
func (c *credCipher) encryptNullable(plaintext string) (any, error) {
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

// decrypt reverses encryptNullable. An empty input maps to an empty output.
func (c *credCipher) decrypt(encoded string) (string, error) {
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

// decryptPtr decrypts a nullable column in place: NULL stays NULL.
func (c *credCipher) decryptPtr(enc *string) (*string, error) {
	if enc == nil {
		return nil, nil
	}
	dec, err := c.decrypt(*enc)
	if err != nil {
		return nil, err
	}
	return &dec, nil
}
