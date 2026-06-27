package games

import (
	"regexp"
	"strings"
)

// maxSlugLen mirrors the games.slug column (VARCHAR(120)).
const maxSlugLen = 120

// apostrophes are dropped (not hyphenated) so "Demon's Souls" becomes
// "demons-souls", the conventional slug, rather than "demon-s-souls".
var apostrophes = strings.NewReplacer("'", "", "’", "", "ʼ", "")

// nonSlugChars matches any run of characters that aren't lowercase alphanumerics,
// for collapsing into hyphens.
var nonSlugChars = regexp.MustCompile(`[^a-z0-9]+`)

// slugify turns an arbitrary name into a candidate slug: lowercase, apostrophes
// removed, every run of remaining non-alphanumeric characters collapsed to a single
// hyphen, trimmed, and capped at maxSlugLen. Names with no latin alphanumerics
// (e.g. fully Persian titles) yield an empty string — callers supply a fallback.
func slugify(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	s = apostrophes.Replace(s)
	s = nonSlugChars.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if len(s) > maxSlugLen {
		s = strings.Trim(s[:maxSlugLen], "-")
	}
	return s
}

// fallbackSlug derives a guaranteed-non-empty, collision-resistant slug for code
// paths that don't receive an explicit slug (e.g. direct createGame calls). The
// random suffix keeps it unique without a DB round-trip; the admin flow never uses
// this — it always sends an explicit, uniqueness-checked slug.
func fallbackSlug(name string) (string, error) {
	base := slugify(name)
	if base == "" {
		base = "game"
	}
	suffix, err := newID()
	if err != nil {
		return "", err
	}
	suffix = suffix[:8]
	if len(base) > maxSlugLen-9 {
		base = strings.Trim(base[:maxSlugLen-9], "-")
		if base == "" {
			base = "game"
		}
	}
	return base + "-" + suffix, nil
}
