package orders

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

// cannedClient returns a zarinpalClient pointed at a test server that always
// answers with the given status and body.
func cannedClient(t *testing.T, status int, body string) *zarinpalClient {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(srv.Close)
	return &zarinpalClient{merchantID: "test", apiBase: srv.URL, http: srv.Client()}
}

func TestVerifyPayment_Verified(t *testing.T) {
	c := cannedClient(t, 200, `{"data":{"code":100,"ref_id":12345},"errors":[]}`)
	refID, err := c.verifyPayment(context.Background(), 1000, "S1")
	if err != nil {
		t.Fatalf("want success, got %v", err)
	}
	if refID != 12345 {
		t.Fatalf("ref_id = %d, want 12345", refID)
	}
}

func TestVerifyPayment_AlreadyVerified(t *testing.T) {
	// 101 = verified on a previous call; still a success.
	c := cannedClient(t, 200, `{"data":{"code":101,"ref_id":999},"errors":[]}`)
	refID, err := c.verifyPayment(context.Background(), 1000, "S1")
	if err != nil {
		t.Fatalf("101 should be success, got %v", err)
	}
	if refID != 999 {
		t.Fatalf("ref_id = %d, want 999", refID)
	}
}

func TestVerifyPayment_DefiniteFailures(t *testing.T) {
	// -51 is the only documented verify result that definitively means the
	// payment failed. It is safe to fail the order and refund reserved wallet.
	c := cannedClient(t, 401, `{"data":[],"errors":{"code":-51,"message":"x"}}`)
	_, err := c.verifyPayment(context.Background(), 1000, "S1")
	if !errors.Is(err, ErrPaymentNotVerified) {
		t.Fatalf("want ErrPaymentNotVerified, got %v", err)
	}
}

func TestVerifyPayment_ReconciliationFailuresStayUnknown(t *testing.T) {
	// These can indicate an amount, merchant, authority, or provider-side problem
	// after money moved. Never fail/refund the order automatically.
	for _, code := range []int{-50, -52, -53, -54, -55} {
		body := fmt.Sprintf(`{"data":[],"errors":{"code":%d,"message":"x"}}`, code)
		c := cannedClient(t, 401, body)
		_, err := c.verifyPayment(context.Background(), 1000, "S1")
		if err == nil {
			t.Errorf("code %d: want an error", code)
		} else if errors.Is(err, ErrPaymentNotVerified) {
			t.Errorf("code %d: must remain UNKNOWN, got %v", code, err)
		}
	}
}

func TestVerifyPayment_UnexpectedIsUnknown(t *testing.T) {
	// -52 ("Oops, contact support") is ambiguous and must NOT be treated as a
	// definitive failure, or a possibly-paid order would be wrongly failed.
	c := cannedClient(t, 200, `{"data":[],"errors":{"code":-52,"message":"oops"}}`)
	_, err := c.verifyPayment(context.Background(), 1000, "S1")
	if err == nil {
		t.Fatal("want an error")
	}
	if errors.Is(err, ErrPaymentNotVerified) {
		t.Fatal("-52 must be UNKNOWN, not a definitive failure")
	}
}

func TestVerifyPayment_OpaqueServerErrorIsUnknown(t *testing.T) {
	c := cannedClient(t, 500, `{}`)
	_, err := c.verifyPayment(context.Background(), 1000, "S1")
	if err == nil {
		t.Fatal("want an error")
	}
	if errors.Is(err, ErrPaymentNotVerified) {
		t.Fatal("opaque 500 must be UNKNOWN, not a definitive failure")
	}
}

func TestVerifyPayment_GarbageBodyIsUnknown(t *testing.T) {
	c := cannedClient(t, 200, `not json at all`)
	_, err := c.verifyPayment(context.Background(), 1000, "S1")
	if err == nil {
		t.Fatal("want an error")
	}
	if errors.Is(err, ErrPaymentNotVerified) {
		t.Fatal("unparseable body must be UNKNOWN")
	}
}

func TestVerifyPayment_TransportErrorIsUnknown(t *testing.T) {
	// Point at a server we immediately close to force a transport failure.
	srv := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}))
	url := srv.URL
	srv.Close()
	c := &zarinpalClient{merchantID: "t", apiBase: url, http: &http.Client{}}
	_, err := c.verifyPayment(context.Background(), 1000, "S1")
	if err == nil {
		t.Fatal("want a transport error")
	}
	if errors.Is(err, ErrPaymentNotVerified) {
		t.Fatal("transport error must be UNKNOWN")
	}
}

func TestRequestPayment_Success(t *testing.T) {
	c := cannedClient(t, 200, `{"data":{"code":100,"authority":"S00000000000000000000000000000abcd"},"errors":[]}`)
	auth, err := c.requestPayment(context.Background(), 1000, "desc", "http://cb", nil)
	if err != nil {
		t.Fatalf("want success, got %v", err)
	}
	if auth == "" {
		t.Fatal("empty authority on success")
	}
}

func TestRequestPayment_SendsTomanAndManualVerification(t *testing.T) {
	var got struct {
		Amount   int    `json:"amount"`
		Currency string `json:"currency"`
		Metadata struct {
			AutoVerify *bool  `json:"auto_verify"`
			OrderID    string `json:"order_id"`
		} `json:"metadata"`
	}
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := json.NewDecoder(r.Body).Decode(&got); err != nil {
			t.Errorf("decode request: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"data":{"code":100,"authority":"A00000000000000000000000000000abcd"},"errors":[]}`))
	}))
	t.Cleanup(srv.Close)
	c := &zarinpalClient{merchantID: "test", apiBase: srv.URL, http: srv.Client()}

	_, err := c.requestPayment(context.Background(), 12500, "desc", "https://example.com/callback", map[string]any{
		"auto_verify": false,
		"order_id":    "100123",
	})
	if err != nil {
		t.Fatalf("requestPayment: %v", err)
	}
	if got.Amount != 12500 || got.Currency != "IRT" {
		t.Fatalf("amount/currency = %d/%q, want 12500/IRT", got.Amount, got.Currency)
	}
	if got.Metadata.AutoVerify == nil || *got.Metadata.AutoVerify {
		t.Fatalf("metadata.auto_verify = %v, want false", got.Metadata.AutoVerify)
	}
	if got.Metadata.OrderID != "100123" {
		t.Fatalf("metadata.order_id = %q, want 100123", got.Metadata.OrderID)
	}
}

func TestRequestPayment_FailureCode(t *testing.T) {
	c := cannedClient(t, 200, `{"data":[],"errors":{"code":-9,"message":"validation"}}`)
	if _, err := c.requestPayment(context.Background(), 1000, "d", "http://cb", nil); err == nil {
		t.Fatal("a failure code must return an error")
	}
}

func TestParseEnvelope_BothShapes(t *testing.T) {
	d, e := parseEnvelope([]byte(`{"data":{"code":100,"ref_id":7},"errors":[]}`))
	if e != nil || d.Code != 100 || d.RefID != 7 {
		t.Fatalf("success shape parsed wrong: d=%+v e=%v", d, e)
	}

	d2, e2 := parseEnvelope([]byte(`{"data":[],"errors":{"code":-51,"message":"x"}}`))
	if e2 == nil || e2.Code != -51 || d2.Code != 0 {
		t.Fatalf("failure shape parsed wrong: d=%+v e=%v", d2, e2)
	}
}
