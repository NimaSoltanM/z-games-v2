# Z-Games Design Language

> The single source of truth for how the Z-Games frontend (`frontend`) looks and feels.
> Read this before building or changing any UI. New screens must look like they belong next
> to `/games`, `/games/$id`, `/cart`, and `/auth`. When in doubt, open those files and copy the
> pattern — do not invent a new style.

## 0. Non-negotiables

- **RTL + Persian.** Every screen is right-to-left (`dir="rtl"`), every user-facing string is Persian.
- **Use the shadcn components in `src/components/ui`.** Don't hand-roll buttons, inputs, sheets,
  badges, accordions, etc. when one exists. Available today: `button`, `badge`, `card`,
  `separator`, `skeleton`, `input`, `label`, `sheet`, `accordion`, `toggle`, `toggle-group`.
  Need something new (dropdown-menu, avatar, dialog…)? Add it via shadcn, don't improvise.
- **Icons: `lucide-react` only.** Sizes `size-3`, `size-3.5`, `size-4`, `size-5`.
- **Tailwind v4 + theme tokens only.** Use semantic tokens (`bg-background`, `text-muted-foreground`,
  `border-border`, `text-primary`…). Never hardcode hex/rgb. The one allowed literal-color exception
  is the PlayStation brand palette below.

## 1. Foundations

| Token | Value | Notes |
| --- | --- | --- |
| Font | `Noto Sans Arabic Variable` (`font-sans`) | Already global; don't set per-component. |
| Theme | dark by default, light supported | Near-monochrome with a subtle plum/violet hue (oklch hue ~322–326). |
| `--radius` | `0.45rem` | Prefer `rounded-lg` / `rounded-xl` / `rounded-2xl`. |
| Primary (dark) | near-white | So a `default` button is light-on-dark; **prices and key accents use `text-primary`**. |
| Accent glow | `violet-500` | Only for decorative ambient blobs, never text/borders. |

Digits: format with `toLocaleString("fa-IR")` and add `tabular-nums`. Currency string is `تومان`
(use `formatToman()` from `@/features/games`).

## 2. The page shell (signature look)

Every full page uses the grid-lines background + ambient glow blobs + a max-width container.

```tsx
<div className="relative min-h-screen bg-background bg-grid-lines">
  {/* ambient glow — decorative, never interactive */}
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
    <div className="absolute top-1/2 -left-48 h-80 w-80 rounded-full bg-violet-500/8 blur-3xl" />
    <div className="absolute -bottom-32 right-1/3 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />
  </div>

  <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
    {/* content */}
  </div>
</div>
```

- `bg-grid-lines` is a custom utility (48px violet grid) defined in `styles.css`.
- Container width by page type: lists `max-w-7xl` · cart `max-w-5xl` · detail `max-w-4xl` ·
  focused forms `max-w-sm`. Padding is always `px-4 sm:px-6 lg:px-8`.
- Header is ~57px, so secondary full-height sections use `min-h-[calc(100vh-57px)]`.

## 3. Surfaces

- **Glass card (default surface):** `rounded-xl border border-border/60 bg-card/75 backdrop-blur-sm`
  (use `rounded-2xl` for larger panels like the auth card / order summary).
- **Subtle inset panel:** `rounded-xl border border-border/60 bg-background/60 backdrop-blur-sm`.
- **Sticky bar (header / toolbar):** `sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-md`.
  Optional gradient hairline accent under it:
  ```
  after:absolute after:bottom-0 after:inset-x-0 after:h-px after:bg-linear-to-r
  after:from-transparent after:via-primary/40 after:to-transparent
  ```
- **Hover-able card:** add `group transition-all duration-200 hover:border-primary/40
  hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 cursor-pointer`.

Text hierarchy: titles `font-bold` / `font-semibold` `text-foreground`; secondary
`text-muted-foreground`; prices & key numbers `text-primary font-semibold`.

## 4. PlayStation brand colors (the only allowed literal colors)

Import from `@/features/games` — don't redefine:

- `PLATFORM_LABEL`, `PLATFORM_BADGE_CLASS` (PS4 = blue, PS5 = white), `PLATFORM_GLOW_CLASS`,
  `PLATFORM_ACCENT_CLASS`, `ZARFIAT_LABEL`.

PS4 reads blue (`blue-600/15 text-blue-400 border-blue-600/30`), PS5 reads white
(`white/8 text-zinc-200 border-white/15`). Use a `Badge variant="secondary"` with the brand class.

## 5. Selected / active state

The house style for "this option is selected" is a **start-side accent border + tint** (RTL → right):

```
border-r-2 border-primary bg-primary/8 font-semibold text-primary   // selected
border-r-2 border-transparent hover:bg-accent text-foreground       // idle
```

For nav links using TanStack Router's active class:
`[&.active]:text-foreground [&.active]:font-medium`, idle `text-muted-foreground hover:text-foreground`,
all with `transition-colors`.

## 6. States

- **Empty:** centered column — icon in a rounded square, heading, subtext, CTA.
  ```tsx
  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm">
    <Icon className="size-8 text-muted-foreground/40" />
  </div>
  ```
- **Loading:** `Skeleton` blocks that mirror the final layout shape (not a spinner).
- **Error:** `ErrorBoundary` fallback — short Persian message + an outline "تلاش مجدد" button.
  Routes follow the mandatory data-fetching skeleton in `docs/tanstack/must-use.txt`.

## 7. Buttons & controls

- Variants: `default` (primary action), `outline` (secondary), `ghost` (tertiary/icon),
  `secondary` (active toggle). Sizes: `sm` for dense toolbars, `icon` (`h-8 w-8`) for icon-only.
- Disabled real actions when not allowed (e.g. quantity `disabled={qty >= 10}`), don't just hide.
- Toolbars that overflow on mobile scroll horizontally: `overflow-x-auto scrollbar-none`.

## 8. Responsive

Mobile-first. Reveal density with breakpoints:
- Labels/extras: `hidden sm:inline`. Sidebars/desktop-only: `hidden lg:block`.
- Filters → `Sheet` (`side="right"`) on mobile, sticky `aside` (`sticky top-24`) on desktop.
- Persistent summaries → fixed bottom bar on mobile (`lg:hidden fixed bottom-0 inset-x-0 z-20`),
  inline panel on desktop. Add bottom padding to scroll content so the bar never overlaps it.
- Grids: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` (cards), `grid-cols-2 sm:grid-cols-3` (tiles).

## 9. RTL rules (easy to get wrong)

- Accent/selection borders go on the **start** edge → `border-r-*`.
- Floating badges sit at the **end** corner → e.g. cart count `absolute -top-1.5 -left-1.5`.
- "Back" points right → `ArrowRight`. "Forward/continue" arrows point left.
- Lay out with logical flow (`flex` + `gap`); avoid hardcoded `left/right` margins where `gap` works.

## 10. Motion

- Default `transition-colors`; richer affordances `transition-all duration-200`.
- Card hover = lift (`hover:-translate-y-1`) + primary-tinted shadow.
- Cross-page shared element: set `viewTransitionName` on the element and `viewTransition` on the
  `Link` (see game covers: `viewTransitionName: game-cover-${id}`).
- Keep it subtle — this is a storefront, not a showcase. No gratuitous animation.

---

### Quick checklist before shipping a screen
1. Page shell: `bg-grid-lines` + ambient glow + correct `max-w-*` container.
2. Surfaces are glass (`bg-card/75 backdrop-blur-sm border-border/60`).
3. All strings Persian, layout RTL-correct, numbers `fa-IR` + `tabular-nums`.
4. Reused shadcn components + lucide icons; no custom primitives.
5. Empty / loading / error states all handled.
6. Looks at home beside `/games` on both mobile and desktop.
