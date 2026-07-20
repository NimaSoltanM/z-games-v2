package auth

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
)

func TestPayamakPanelSenderSendsBaseServiceNumberForm(t *testing.T) {
	var gotForm url.Values
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("method = %s, want POST", r.Method)
		}
		if got := r.Header.Get("Content-Type"); got != "application/x-www-form-urlencoded" {
			t.Errorf("Content-Type = %q", got)
		}
		if err := r.ParseForm(); err != nil {
			t.Errorf("parse form: %v", err)
		}
		gotForm = r.Form
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"Value":"1234567890123456","RetStatus":1,"StrRetStatus":"Ok"}`))
	}))
	defer server.Close()

	sender := &payamakPanelSender{
		username: "panel-user",
		apiKey:   "api-secret",
		bodyID:   4321,
		endpoint: server.URL,
		client:   server.Client(),
	}
	if err := sender.Send(context.Background(), "+989121234567", "12345"); err != nil {
		t.Fatalf("Send: %v", err)
	}

	want := map[string]string{
		"username": "panel-user",
		"password": "api-secret",
		"to":       "09121234567",
		"text":     "12345",
		"bodyId":   "4321",
	}
	for key, value := range want {
		if got := gotForm.Get(key); got != value {
			t.Errorf("form %s = %q, want %q", key, got, value)
		}
	}
}

func TestPayamakPanelSenderReturnsProviderError(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"Value":"-4","RetStatus":35,"StrRetStatus":"InvalidData"}`))
	}))
	defer server.Close()

	sender := &payamakPanelSender{
		username: "panel-user",
		apiKey:   "api-secret",
		bodyID:   4321,
		endpoint: server.URL,
		client:   server.Client(),
	}
	err := sender.Send(context.Background(), "09121234567", "12345")
	var providerErr *payamakPanelError
	if !errors.As(err, &providerErr) {
		t.Fatalf("error = %v, want payamakPanelError", err)
	}
	if providerErr.Code != "-4" || providerErr.RetStatus != 35 {
		t.Fatalf("provider error = %+v", providerErr)
	}
}

func TestPayamakPanelSenderRejectsInvalidSuccessReceipt(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"Value":"18","RetStatus":1,"StrRetStatus":"Ok"}`))
	}))
	defer server.Close()

	sender := &payamakPanelSender{
		username: "panel-user",
		apiKey:   "api-secret",
		bodyID:   4321,
		endpoint: server.URL,
		client:   server.Client(),
	}
	if err := sender.Send(context.Background(), "09121234567", "12345"); err == nil {
		t.Fatal("expected invalid receipt ID to fail")
	}
}

func TestPayamakValueAcceptsLargeJSONInteger(t *testing.T) {
	got, err := payamakValue([]byte("123456789012345678901234567890"))
	if err != nil {
		t.Fatalf("payamakValue: %v", err)
	}
	if got != "123456789012345678901234567890" {
		t.Fatalf("value = %q", got)
	}
}
