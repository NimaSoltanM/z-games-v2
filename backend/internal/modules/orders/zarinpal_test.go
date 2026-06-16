package orders

import (
	"context"
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
	// ZarinPal returns these inside a non-2xx body (the sandbox uses 401). Each is
	// a definitive "not paid" → ErrPaymentNotVerified so the order is failed.
	for _, code := range []int{-50, -51, -53, -54, -55} {
		body := fmt.Sprintf(`{"data":[],"errors":{"code":%d,"message":"x"}}`, code)
		c := cannedClient(t, 401, body)
		_, err := c.verifyPayment(context.Background(), 1000, "S1")
		if !errors.Is(err, ErrPaymentNotVerified) {
			t.Errorf("code %d: want ErrPaymentNotVerified, got %v", code, err)
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
