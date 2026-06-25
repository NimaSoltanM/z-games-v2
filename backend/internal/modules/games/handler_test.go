package games

import (
	"errors"
	"testing"
)

func TestParsePreorderUpdate(t *testing.T) {
	t.Run("status only preserves date", func(t *testing.T) {
		upd, err := parsePreorderUpdate([]byte(`{"release_status":"released"}`))
		if err != nil {
			t.Fatal(err)
		}
		if upd.status != "released" || upd.updateDate || upd.releaseDate != nil {
			t.Fatalf("got %+v, want status=released updateDate=false date=nil", upd)
		}
	})

	t.Run("explicit null clears date", func(t *testing.T) {
		upd, err := parsePreorderUpdate([]byte(`{"release_status":"pre_order","release_date":null}`))
		if err != nil {
			t.Fatal(err)
		}
		if !upd.updateDate || upd.releaseDate != nil {
			t.Fatalf("got %+v, want updateDate=true date=nil", upd)
		}
	})

	t.Run("empty string clears date", func(t *testing.T) {
		upd, err := parsePreorderUpdate([]byte(`{"release_status":"pre_order","release_date":""}`))
		if err != nil {
			t.Fatal(err)
		}
		if !upd.updateDate || upd.releaseDate != nil {
			t.Fatalf("got %+v, want updateDate=true date=nil", upd)
		}
	})

	t.Run("date string sets date", func(t *testing.T) {
		upd, err := parsePreorderUpdate([]byte(`{"release_status":"pre_order","release_date":"2026-11-19"}`))
		if err != nil {
			t.Fatal(err)
		}
		if !upd.updateDate || upd.releaseDate == nil || upd.releaseDate.Year() != 2026 {
			t.Fatalf("got %+v, want updateDate=true date=2026-11-19", upd)
		}
	})

	t.Run("rfc3339 sets date", func(t *testing.T) {
		upd, err := parsePreorderUpdate([]byte(`{"release_status":"pre_order","release_date":"2026-11-19T00:00:00Z"}`))
		if err != nil || !upd.updateDate || upd.releaseDate == nil {
			t.Fatalf("got %+v err=%v, want a parsed date", upd, err)
		}
	})

	t.Run("missing status errors", func(t *testing.T) {
		if _, err := parsePreorderUpdate([]byte(`{"release_date":null}`)); err == nil {
			t.Fatal("expected error for missing release_status")
		}
	})

	t.Run("bad date errors", func(t *testing.T) {
		if _, err := parsePreorderUpdate([]byte(`{"release_status":"pre_order","release_date":"nope"}`)); !errors.Is(err, errBadReleaseDate) {
			t.Fatalf("got %v, want errBadReleaseDate", err)
		}
	})

	t.Run("non-string date errors", func(t *testing.T) {
		if _, err := parsePreorderUpdate([]byte(`{"release_status":"pre_order","release_date":123}`)); !errors.Is(err, errBadReleaseDate) {
			t.Fatalf("got %v, want errBadReleaseDate", err)
		}
	})

	t.Run("invalid json errors", func(t *testing.T) {
		if _, err := parsePreorderUpdate([]byte(`not json`)); err == nil {
			t.Fatal("expected error for invalid json")
		}
	})
}
