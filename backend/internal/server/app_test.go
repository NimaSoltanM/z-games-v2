package server

import (
	"reflect"
	"testing"
)

func TestTrustedProxies(t *testing.T) {
	t.Setenv("TRUSTED_PROXIES", " 127.0.0.1,10.0.0.0/8, ")
	want := []string{"127.0.0.1", "10.0.0.0/8"}
	if got := trustedProxies(); !reflect.DeepEqual(got, want) {
		t.Fatalf("trustedProxies = %#v, want %#v", got, want)
	}
}
