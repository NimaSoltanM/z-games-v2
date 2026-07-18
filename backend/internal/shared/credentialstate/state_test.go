package credentialstate

import "testing"

func TestNormalizeAccountID(t *testing.T) {
	if got := NormalizeAccountID("  Player@Example.COM  "); got != "player@example.com" {
		t.Fatalf("NormalizeAccountID() = %q", got)
	}
}

func TestAccountIdentityUsesPlatformFamilies(t *testing.T) {
	ps4 := AccountIdentity("Player@Example.com", "ps4")
	ps5 := AccountIdentity(" player@example.COM ", "ps5")
	xboxOne := AccountIdentity("Player@Example.com", "xbox_one")
	xboxSeries := AccountIdentity("Player@Example.com", "xbox_series")
	steam := AccountIdentity("Player@Example.com", "steam")
	steamDeck := AccountIdentity("Player@Example.com", "steam_deck")

	if ps4 != ps5 {
		t.Fatalf("PlayStation generations should share identity: %q != %q", ps4, ps5)
	}
	if xboxOne != xboxSeries {
		t.Fatalf("Xbox generations should share identity: %q != %q", xboxOne, xboxSeries)
	}
	if ps5 == xboxSeries || ps5 == steam || xboxSeries == steam {
		t.Fatal("different account ecosystems must not share identity")
	}
	if steam != steamDeck {
		t.Fatalf("platform variants should share identity: %q != %q", steam, steamDeck)
	}
	if got := PlatformFamily("ps6"); got != "playstation" {
		t.Fatalf("future PlayStation family = %q", got)
	}
	if got := PlatformFamily("steam_deck"); got != "steam" {
		t.Fatalf("unknown platform family = %q", got)
	}
}
