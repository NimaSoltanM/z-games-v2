package auth

import "testing"

func TestValidIranianMobile(t *testing.T) {
	tests := []struct {
		phone string
		want  bool
	}{
		{"09123456789", true},
		{"+989123456789", true},
		{" 09123456789 ", true},
		{"0912345678", false},
		{"02112345678", false},
		{"not-a-phone", false},
	}
	for _, tt := range tests {
		if got := validIranianMobile(tt.phone); got != tt.want {
			t.Errorf("validIranianMobile(%q) = %v, want %v", tt.phone, got, tt.want)
		}
	}
}
