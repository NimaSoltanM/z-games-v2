# Z-Games SEO and GEO contract

This file is the source of truth for search-facing frontend work. Read it before
adding or changing a route, public content, metadata, structured data, or site
navigation. Search visibility is a product constraint, not a cleanup step.

## Route indexability

Every new route must be classified before it is built:

| Route kind | Indexing rule |
| --- | --- |
| Public marketing, editorial, catalog, and product pages | Indexable with a self-referencing canonical |
| Search, sorting, filters, and other faceted URL state | `noindex, nofollow`; canonical points to the clean parent page |
| Clean catalog pagination with no active facets | Indexable with crawlable links and a self-canonical URL for that page |
| Auth, cart, payment, dashboard, admin, and other private/transactional pages | `noindex, nofollow`; do not add them to the sitemap |
| Draft, staging, preview, or non-HTTPS deployments | Block all crawling and emit `noindex` globally |

The production build must set both `VITE_SITE_URL=https://<canonical-domain>` and
`VITE_ALLOW_INDEXING=true`. Every other environment stays blocked. Never enable
indexing until the canonical host and HTTPS deployment are final.

## Required route implementation

- Use the helpers in `src/features/seo`; do not duplicate meta-tag construction.
- Every public route needs a unique Persian title, useful description,
  self-referencing canonical, Open Graph fields, and Twitter card fields.
- Every non-public route or parent layout needs `noIndexHead()`.
- Metadata and the page's main content must exist in the initial server-rendered
  HTML. Never populate SEO content in `useEffect`.
- Dynamic route metadata must come from loader data. Keep the mandatory TanStack
  Query loader-prefetch, Suspense, and ErrorBoundary pattern.
- A missing product must return a real 404 through TanStack Router, not a soft-404
  page with status 200.
- Use one descriptive, visible `h1`. Subsequent headings must form a meaningful
  hierarchy; do not use heading elements only for visual styling.
- Link important pages through normal crawlable `<a>`/TanStack `<Link>` elements.
  Do not rely on click handlers for navigation.

Titles and descriptions are written for humans. Put the page's actual search
intent early, keep the store name at the end, and avoid repetition, keyword
stuffing, fake urgency, or claims that the page cannot prove.

## Canonicals, robots, and sitemap

- `src/features/seo/config.ts` owns the canonical origin. Never derive it from an
  incoming host header or hardcode a production domain in a route.
- `/robots.txt` is environment-aware. Keep private paths blocked and keep its
  sitemap URL on the canonical HTTPS origin.
- `/sitemap.xml` contains only canonical, public pages that return 200. Product
  entries come from the active catalog and use their real `updated_at` value.
- Add a public route to the sitemap when it launches. Never add query-string
  filters, search results, auth/cart/payment pages, redirects, or missing pages.
- Paginated catalog pages must use normal links and self-canonical URLs. Do not
  canonicalize page 2+ to page 1. The sitemap may still list only the clean first
  page because crawlers discover later pages through the pagination links.
- If the catalog grows beyond 50,000 URLs or 50 MB uncompressed, split it into
  sitemap files behind a sitemap index.

## Structured data

- Render JSON-LD in the initial HTML and serialize it with `stringifyJsonLd()`;
  never interpolate unescaped database values into a script element.
- Product pages may use `Product`, `Offer`, and `BreadcrumbList` only when their
  values match visible page content.
- Store prices are Toman. Schema.org requires ISO 4217, so publish the equivalent
  Rial value (`Toman * 10`) with `priceCurrency: "IRR"`.
- Do not invent ratings, reviews, brands, stock, prices, social profiles, contact
  details, return policies, shipping policies, or business identifiers.
- Do not add FAQ structured data to this commercial site merely to chase rich
  results. Visible FAQs can still help customers. Do not use deprecated HowTo
  rich-result markup.
- Validate schema after any schema change and confirm that its URLs are absolute.

## Content and GEO

- Answer the page's main question directly near the top, in clear Persian.
- Product pages must state what is being sold, supported consoles/capacities,
  current purchasable options, and material restrictions. Marketing pages must
  link to the relevant catalog or rules page.
- Stable platform/category landing pages may be indexable only when they have a
  clean route, unique useful copy, real matching products, and internal links.
  Do not generate thin pages from every filter combination.
- Editorial guides should be statically bundled or server-rendered Markdown; do
  not fetch and render their meaningful text only after hydration. Include title,
  author/reviewer where truthful, and a visible updated date when maintained.
- `/llms.txt` is a concise factual orientation file. Keep it synchronized with
  the real business and key public URLs; do not treat it as a ranking guarantee.
- Never mass-produce near-duplicate or AI-spun pages. Accuracy, original help,
  clear entities, and maintainable content come first.

## Images and performance

- Product covers need descriptive alt text, intrinsic `width`/`height`, and a
  stable aspect-ratio container to prevent layout shift.
- The likely LCP image may load eagerly with high fetch priority. Images below the
  fold should be lazy-loaded. Do not lazy-load the LCP image.
- Compress images, prefer WebP/AVIF where practical, and avoid shipping oversized
  originals. Keep the default social image crawlable on the canonical host.
- Performance targets at the 75th percentile: LCP <= 2.5 s, INP <= 200 ms, and
  CLS <= 0.1. Treat regressions as product bugs.

## Release checklist

Before releasing a public route:

1. Inspect the server-rendered HTML for title, description, robots, canonical,
   social metadata, visible `h1`, content, and any JSON-LD.
2. Test canonical and noindex behavior with and without query parameters.
3. Confirm normal links reach the page and that missing records return 404.
4. Confirm sitemap membership matches the route's indexability classification.
5. Run `bun run test`, `bun run typecheck`, and `bun run build`.
6. After the production domain exists, verify robots and sitemap, add the site to
   Google Search Console, submit the sitemap, and monitor indexing, Core Web
   Vitals, crawl errors, and search queries. No code change can guarantee first
   place; technical SEO makes useful pages eligible to compete.
