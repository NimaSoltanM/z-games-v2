package auth

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	payamakPanelEndpoint = "https://rest.payamak-panel.com/api/SendSMS/BaseServiceNumber"
	payamakResponseLimit = 1 << 20
)

type otpSender interface {
	Send(ctx context.Context, phone, code string) error
}

type payamakPanelSender struct {
	username string
	apiKey   string
	bodyID   int
	endpoint string
	client   *http.Client
}

func payamakPanelSenderFromEnv() otpSender {
	username := strings.TrimSpace(os.Getenv("PAYAMAK_PANEL_USERNAME"))
	apiKey := strings.TrimSpace(os.Getenv("PAYAMAK_PANEL_API_KEY"))
	bodyID, err := strconv.Atoi(strings.TrimSpace(os.Getenv("PAYAMAK_PANEL_BODY_ID")))
	if username == "" || apiKey == "" || err != nil || bodyID <= 0 {
		return nil
	}

	return &payamakPanelSender{
		username: username,
		apiKey:   apiKey,
		bodyID:   bodyID,
		endpoint: payamakPanelEndpoint,
		client:   &http.Client{Timeout: 10 * time.Second},
	}
}

type payamakPanelResponse struct {
	Value        json.RawMessage `json:"Value"`
	RetStatus    int             `json:"RetStatus"`
	StrRetStatus string          `json:"StrRetStatus"`
}

type payamakPanelError struct {
	Code      string
	RetStatus int
	Status    string
}

func (e *payamakPanelError) Error() string {
	return fmt.Sprintf("payamak panel rejected OTP delivery: code=%s ret_status=%d status=%s", e.Code, e.RetStatus, e.Status)
}

func (s *payamakPanelSender) Send(ctx context.Context, phone, code string) error {
	phone = normalizePhone(phone)
	if !validIranianMobile(phone) {
		return errors.New("payamak panel OTP delivery: invalid Iranian mobile number")
	}
	if len(code) != 5 || strings.Trim(code, "0123456789") != "" {
		return errors.New("payamak panel OTP delivery: code must contain exactly five digits")
	}

	form := url.Values{
		"username": {s.username},
		"password": {s.apiKey},
		"to":       {phone},
		"text":     {code},
		"bodyId":   {strconv.Itoa(s.bodyID)},
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, s.endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return fmt.Errorf("create payamak panel request: %w", err)
	}
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	request.Header.Set("Accept", "application/json")

	response, err := s.client.Do(request)
	if err != nil {
		return fmt.Errorf("send payamak panel request: %w", err)
	}
	defer response.Body.Close()

	body, err := io.ReadAll(io.LimitReader(response.Body, payamakResponseLimit+1))
	if err != nil {
		return fmt.Errorf("read payamak panel response: %w", err)
	}
	if len(body) > payamakResponseLimit {
		return errors.New("read payamak panel response: body exceeds size limit")
	}
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("payamak panel returned HTTP status %d", response.StatusCode)
	}

	var result payamakPanelResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return fmt.Errorf("decode payamak panel response: %w", err)
	}
	value, err := payamakValue(result.Value)
	if err != nil {
		return err
	}

	if result.RetStatus != 1 || !strings.EqualFold(result.StrRetStatus, "Ok") {
		return &payamakPanelError{Code: value, RetStatus: result.RetStatus, Status: result.StrRetStatus}
	}
	if len(value) <= 15 || strings.Trim(value, "0123456789") != "" {
		return fmt.Errorf("payamak panel returned invalid receipt ID %q", value)
	}
	return nil
}

func payamakValue(raw json.RawMessage) (string, error) {
	if len(raw) == 0 || string(raw) == "null" {
		return "", errors.New("decode payamak panel response: Value is missing")
	}

	var value string
	if err := json.Unmarshal(raw, &value); err == nil {
		return strings.TrimSpace(value), nil
	}

	value = strings.TrimSpace(string(raw))
	digits := strings.TrimPrefix(value, "-")
	if digits == "" || strings.Trim(digits, "0123456789") != "" {
		return "", errors.New("decode payamak panel response: Value is not a string or integer")
	}
	return value, nil
}
