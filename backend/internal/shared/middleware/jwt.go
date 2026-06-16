package middleware

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const (
	LocalUserID   = "userID"
	LocalUserRole = "userRole"
)

var (
	ErrTokenInvalid = errors.New("TOKEN_INVALID")
	ErrTokenExpired = errors.New("TOKEN_EXPIRED")
)

func jwtSecret() []byte {
	return []byte(os.Getenv("JWT_SECRET"))
}

func SignAuthToken(userID, phone string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": userID,
		"phone":  phone,
		"type":   "auth",
		"exp":    time.Now().Add(30 * 24 * time.Hour).Unix(),
	})
	return token.SignedString(jwtSecret())
}

func SignRegistrationToken(phone string) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"phone": phone,
		"type":  "registration",
		"exp":   time.Now().Add(10 * time.Minute).Unix(),
	})
	return token.SignedString(jwtSecret())
}

func VerifyRegistrationToken(tokenStr string) (phone string, err error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrTokenInvalid
		}
		return jwtSecret(), nil
	})
	if err != nil || !token.Valid {
		return "", ErrTokenInvalid
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["type"] != "registration" {
		return "", ErrTokenInvalid
	}

	phone, ok = claims["phone"].(string)
	if !ok || phone == "" {
		return "", ErrTokenInvalid
	}
	return phone, nil
}

// verifyAuthToken validates an auth JWT and returns its user id. The user's role
// is intentionally NOT read from the token — it's loaded fresh from the DB on
// every request (see authenticate) so privilege changes apply immediately.
func verifyAuthToken(tokenStr string) (userID string, err error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrTokenInvalid
		}
		return jwtSecret(), nil
	})
	if err != nil || !token.Valid {
		return "", ErrTokenInvalid
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["type"] != "auth" {
		return "", ErrTokenInvalid
	}

	userID, ok = claims["userId"].(string)
	if !ok || userID == "" {
		return "", ErrTokenInvalid
	}
	return userID, nil
}
