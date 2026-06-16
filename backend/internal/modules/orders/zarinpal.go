package orders

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"
)

// ErrPaymentNotVerified means ZarinPal answered with a definitive failure code
// for this verify (e.g. -51 not paid, -54 invalid authority) — safe to fail the
// order. Any OTHER error from verifyPayment (transport, timeout, unreadable
// body, or the ambiguous -52 "unexpected error") means the outcome is UNKNOWN:
// the customer may have actually paid, so the order must be left pending for
// reconciliation rather than marked failed.
var ErrPaymentNotVerified = errors.New("zarinpal: payment not verified")

// ZarinPal verify result codes (see docs/zarinpal/llms-full.md error table).
const (
	zpCodeVerified        = 100 // verified now
	zpCodeAlreadyVerified = 101 // verified on a previous call
	zpCodeUnexpected      = -52 // "Oops, contact support" — ambiguous, not definitive
)

// zarinpalClient talks to ZarinPal's v4 payment API. Sandbox just swaps the host.
type zarinpalClient struct {
	merchantID string
	apiBase    string // .../pg/v4/payment
	startPay   string // .../pg/StartPay/
	http       *http.Client
}

func newZarinpalClient(merchantID string, sandbox bool) *zarinpalClient {
	host := "https://payment.zarinpal.com"
	if sandbox {
		host = "https://sandbox.zarinpal.com"
	}
	return &zarinpalClient{
		merchantID: merchantID,
		apiBase:    host + "/pg/v4/payment",
		startPay:   host + "/pg/StartPay/",
		http:       &http.Client{Timeout: 20 * time.Second},
	}
}

func (z *zarinpalClient) paymentURL(authority string) string {
	return z.startPay + authority
}

// zpData / zpError model ZarinPal's polymorphic envelope: on success `data` is an
// object and `errors` is `[]`; on failure `data` is `[]`/`{}` and `errors` is an
// object. Both are decoded from json.RawMessage so neither shape breaks parsing.
type zpData struct {
	Code      int    `json:"code"`
	Authority string `json:"authority"`
	RefID     int64  `json:"ref_id"`
	Message   string `json:"message"`
}

type zpError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// parseEnvelope extracts the data object and (if present) the error object,
// tolerating the empty-array form ZarinPal uses for whichever side is absent.
func parseEnvelope(body []byte) (zpData, *zpError) {
	var env struct {
		Data   json.RawMessage `json:"data"`
		Errors json.RawMessage `json:"errors"`
	}
	_ = json.Unmarshal(body, &env)

	var d zpData
	if len(env.Data) > 0 {
		_ = json.Unmarshal(env.Data, &d) // no-op when data is []
	}

	var e zpError
	if len(env.Errors) > 0 && json.Unmarshal(env.Errors, &e) == nil && e.Code != 0 {
		return d, &e
	}
	return d, nil
}

// requestPayment creates a payment session and returns the authority token.
// amount is in Toman (currency IRT).
func (z *zarinpalClient) requestPayment(ctx context.Context, amount int, description, callbackURL string, metadata map[string]string) (string, error) {
	body := map[string]any{
		"merchant_id":  z.merchantID,
		"amount":       amount,
		"currency":     "IRT",
		"description":  description,
		"callback_url": callbackURL,
	}
	if len(metadata) > 0 {
		body["metadata"] = metadata
	}

	raw, err := z.post(ctx, "/request.json", body)
	if err != nil {
		return "", err
	}
	data, zerr := parseEnvelope(raw)
	if data.Code == zpCodeVerified && data.Authority != "" {
		return data.Authority, nil
	}
	code, msg := data.Code, data.Message
	if zerr != nil {
		code, msg = zerr.Code, zerr.Message
	}
	return "", fmt.Errorf("zarinpal request: code=%d msg=%q", code, msg)
}

// verifyPayment confirms a paid session. Codes 100/101 mean paid. A definitive
// failure code returns ErrPaymentNotVerified. Transport problems and the
// ambiguous -52 return a plain error so the caller leaves the order pending.
func (z *zarinpalClient) verifyPayment(ctx context.Context, amount int, authority string) (int64, error) {
	body := map[string]any{
		"merchant_id": z.merchantID,
		"amount":      amount,
		"authority":   authority,
	}

	raw, err := z.post(ctx, "/verify.json", body)
	if err != nil {
		return 0, err // transport/read failure → outcome UNKNOWN
	}

	data, zerr := parseEnvelope(raw)
	if data.Code == zpCodeVerified || data.Code == zpCodeAlreadyVerified {
		return data.RefID, nil
	}

	code := data.Code
	if zerr != nil {
		code = zerr.Code
	}

	// A negative code is ZarinPal stating a definite reason this verify failed —
	// except -52 ("unexpected error, contact support"), which is ambiguous. A
	// zero/unrecognized code means we couldn't read a clear answer. Both of those
	// stay UNKNOWN so we never declare a possibly-paid order failed.
	if code < 0 && code != zpCodeUnexpected {
		return 0, fmt.Errorf("%w: code=%d", ErrPaymentNotVerified, code)
	}
	return 0, fmt.Errorf("zarinpal verify: ambiguous result code=%d", code)
}

// post sends a JSON body and returns the raw response body. It does NOT treat a
// non-2xx status as fatal: ZarinPal returns its real result/error code in the
// body even on 4xx, and the caller needs that code to classify the outcome.
func (z *zarinpalClient) post(ctx context.Context, path string, body any) ([]byte, error) {
	buf, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("zarinpal marshal: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, z.apiBase+path, bytes.NewReader(buf))
	if err != nil {
		return nil, fmt.Errorf("zarinpal new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	res, err := z.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("zarinpal do: %w", err)
	}
	defer res.Body.Close()

	data, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, fmt.Errorf("zarinpal read: %w", err)
	}
	return data, nil
}
