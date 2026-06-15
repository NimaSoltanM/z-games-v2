package orders

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
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

type zpRequestResp struct {
	Data struct {
		Code      int    `json:"code"`
		Authority string `json:"authority"`
		Message   string `json:"message"`
	} `json:"data"`
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

	var resp zpRequestResp
	if err := z.post(ctx, "/request.json", body, &resp); err != nil {
		return "", err
	}
	if resp.Data.Code != 100 || resp.Data.Authority == "" {
		return "", fmt.Errorf("zarinpal request: code=%d msg=%q", resp.Data.Code, resp.Data.Message)
	}
	return resp.Data.Authority, nil
}

type zpVerifyResp struct {
	Data struct {
		Code    int    `json:"code"`
		RefID   int64  `json:"ref_id"`
		Message string `json:"message"`
	} `json:"data"`
}

// verifyPayment confirms a paid session. Code 100 = verified now, 101 = already
// verified previously; both mean the payment succeeded.
func (z *zarinpalClient) verifyPayment(ctx context.Context, amount int, authority string) (int64, error) {
	body := map[string]any{
		"merchant_id": z.merchantID,
		"amount":      amount,
		"authority":   authority,
	}

	var resp zpVerifyResp
	if err := z.post(ctx, "/verify.json", body, &resp); err != nil {
		return 0, err
	}
	if resp.Data.Code != 100 && resp.Data.Code != 101 {
		return 0, fmt.Errorf("zarinpal verify: code=%d msg=%q", resp.Data.Code, resp.Data.Message)
	}
	return resp.Data.RefID, nil
}

func (z *zarinpalClient) post(ctx context.Context, path string, body, out any) error {
	buf, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("zarinpal marshal: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, z.apiBase+path, bytes.NewReader(buf))
	if err != nil {
		return fmt.Errorf("zarinpal new request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	res, err := z.http.Do(req)
	if err != nil {
		return fmt.Errorf("zarinpal do: %w", err)
	}
	defer res.Body.Close()

	if err := json.NewDecoder(res.Body).Decode(out); err != nil {
		return fmt.Errorf("zarinpal decode: %w", err)
	}
	return nil
}
