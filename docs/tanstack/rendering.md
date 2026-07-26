---
id: hydration-errors
title: Hydration Errors
---

### Why it happens

- **Mismatch**: Server HTML differs from client render during hydration
- **Common causes**: `Intl` (locale/time zone), `Date.now()`, random IDs, responsive-only logic, feature flags, user prefs

### Strategy 1 — Make server and client match

- **Pick a deterministic locale/time zone on the server** and use the same on the client
- **Source of truth**: cookie (preferred) or `Accept-Language` header
- **Compute once on the server** and hydrate as initial state

```tsx
// src/start.ts
import { createStart, createMiddleware } from '@tanstack/react-start';
import {
  getRequestHeader,
  getCookie,
  setCookie,
} from '@tanstack/react-start/server';

const localeTzMiddleware = createMiddleware().server(async ({ next }) => {
  const header = getRequestHeader('accept-language');
  const headerLocale = header?.split(',')[0] || 'en-US';
  const cookieLocale = getCookie('locale');
  const cookieTz = getCookie('tz'); // set by client later (see Strategy 2)

  const locale = cookieLocale || headerLocale;
  const timeZone = cookieTz || 'UTC'; // deterministic until client sends tz

  // Persist locale for subsequent requests (optional)
  setCookie('locale', locale, { path: '/', maxAge: 60 * 60 * 24 * 365 });

  return next({ context: { locale, timeZone } });
});

export const startInstance = createStart(() => ({
  requestMiddleware: [localeTzMiddleware],
}));
```

```tsx
// src/routes/index.tsx (example)
import * as React from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getCookie } from '@tanstack/react-start/server';

export const getServerNow = createServerFn().handler(async () => {
  const locale = getCookie('locale') || 'en-US';
  const timeZone = getCookie('tz') || 'UTC';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date());
});

export const Route = createFileRoute('/')({
  loader: () => getServerNow(),
  component: () => {
    const serverNow = Route.useLoaderData() as string;
    return <time dateTime={serverNow}>{serverNow}</time>;
  },
});
```

### Strategy 2 — Let the client tell you its environment

- On first visit, set a cookie with the client time zone; SSR uses `UTC` until then
- Do this without risking mismatches

```tsx
import * as React from 'react';
import { ClientOnly } from '@tanstack/react-router';

function SetTimeZoneCookie() {
  React.useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    document.cookie = `tz=${tz}; path=/; max-age=31536000`;
  }, []);
  return null;
}

export function AppBoot() {
  return (
    <ClientOnly fallback={null}>
      <SetTimeZoneCookie />
    </ClientOnly>
  );
}
```

### Strategy 3 — Make it client-only

- Wrap unstable UI in `<ClientOnly>` to avoid SSR and mismatches

```tsx
import { ClientOnly } from '@tanstack/react-router';
<ClientOnly fallback={<span>—</span>}>
  <RelativeTime ts={someTs} />
</ClientOnly>;
```

### Strategy 4 — Disable or limit SSR for the route

- Use Selective SSR to avoid rendering the component on the server

```tsx
export const Route = createFileRoute('/unstable')({
  ssr: 'data-only', // or false
  component: () => <ExpensiveViz />,
});
```

### Strategy 5 — Last resort suppression

- For small, known-different nodes, you can use React’s `suppressHydrationWarning`

```tsx
<time suppressHydrationWarning>{new Date().toLocaleString()}</time>
```

### Checklist

- **Deterministic inputs**: locale, time zone, feature flags
- **Prefer cookies** for client context; fallback to `Accept-Language`
- **Use `<ClientOnly>`** for inherently dynamic UI
- **Use Selective SSR** when server HTML cannot be stable
- **Avoid blind suppression**; use `suppressHydrationWarning` sparingly

See also: [Execution Model](./execution-model.md), [Code Execution Patterns](./code-execution-patterns.md), [Selective SSR](./selective-ssr.md), [Server Functions](./server-functions.md)

---

id: deferred-hydration
title: Deferred Hydration

---

> Deferred hydration is experimental

On an initial page load, TanStack Start server-renders your page so the browser
can show useful HTML quickly. Hydration is the client-side work that turns that
initial HTML document into an interactive app. It loads and executes JavaScript,
runs components, attaches event handlers, and reconnects the existing DOM to
React.

Deferred hydration applies to this initial document hydration work. After the
app is already running, subsequent client-side navigations render through the
client app; there is no initial server HTML for TanStack Start to preserve.

By default, TanStack Start hydrates the full document. That is usually the
simplest and safest behavior, but large pages can spend meaningful startup time
loading JavaScript and hydrating parts of the page that the user may not need
right away.

Deferred hydration lets you mark selected parts of a page as "not interactive
yet". The server HTML remains in the document, but TanStack Start waits to
hydrate that boundary until a strategy says it is time. By default, the compiler
also moves the boundary children into a separate JavaScript chunk so the browser
can delay loading that code too.

Use deferred hydration when a part of the page should be visible, styled, and
indexable immediately, but does not need to be interactive immediately.

## Add A Deferred Boundary

Use `Hydrate` with a strategy from `@tanstack/react-start/hydration`:

```tsx
import { Hydrate } from '@tanstack/react-start';
import { visible } from '@tanstack/react-start/hydration';

export function ProductPage() {
  return (
    <Hydrate when={visible({ rootMargin: '400px' })}>
      <Reviews />
    </Hydrate>
  );
}
```

On the initial server response, `Reviews` is still rendered to HTML. During the
initial client hydration pass, that HTML is preserved but the `Reviews` React
tree does not hydrate yet. When the boundary comes within `400px` of the
viewport, TanStack Start loads the deferred child chunk and hydrates the
boundary.

`Hydrate` only preserves server HTML that exists in the initial document. If the
same boundary first mounts later, for example after client-side navigation,
there is no server HTML to preserve, so it renders normally on the client.

## Choose What To Defer

The right boundary depends on your page, your product priorities, and real user
behavior. TanStack Start cannot know which parts of your page are safe to delay.

Good candidates are usually SSR content that is not needed for immediate
interaction:

- Below-the-fold reviews, comments, product details, related content, or long
  marketing sections.
- Rich widgets such as maps, charts, carousels, video players, editors, or
  embeds.
- Panels that are activated by intent, such as filters, preview panes, or
  contextual tools.
- UI that only matters for a matching media query.
- Static server-rendered content that should not hydrate on the initial
  document.

Poor candidates are parts of the page users may need immediately:

- Primary navigation, route chrome, search boxes, and account controls.
- Above-the-fold forms, add-to-cart buttons, checkout actions, or consent
  controls.
- The interactive part of the LCP or hero area when users may click it
  immediately.
- Accessibility-critical controls that must be keyboard-ready as soon as the
  page appears.
- Components whose props, context, or shared state are expected to update
  immediately after app startup.

Measure each boundary. A useful boundary reduces startup JavaScript or hydration
work without making expected interactions feel late.

## Comparison To Astro Islands

Astro starts static and asks "what should come alive?" Each answer is an
isolated framework root dropped into HTML. Islands are independent runtimes
sharing a DOM.

TanStack Start starts fully interactive and asks "what can wait?" The whole
document hydrates as one React tree by default; `Hydrate` boundaries are gates
inside that tree. Context, state, and events flow through normally, and
hydration is parent-first.

Same trigger vocabulary, different substrate: Astro composes runtimes, Start
schedules one. That is why Start gets `interaction()`, `condition()`, and intent
bubbling, and why Astro gets multi-framework.

## Comparison To React Selective Hydration

React's selective hydration controls the order in which server-rendered
boundaries hydrate. Deferred hydration controls whether and when each
boundary hydrates at all.

When React hydrates a streaming SSR page, every server-rendered
`<Suspense>` boundary will eventually hydrate. Selective hydration just
decides the order: each boundary hydrates as soon as its code arrives,
and React jumps a boundary to the front of the queue if the user clicks
inside it. The work is fixed by what the server rendered; React
schedules it to feel responsive.

Deferred hydration changes what is in the queue in the first place. A
`Hydrate` boundary names a condition — `visible()`, `idle()`,
`interaction()`, `media()`, `condition()`, or `never()` — and the
boundary stays as static server HTML until that condition fires. By
default the child JavaScript also moves into a separate chunk that the
browser does not download until the boundary is about to hydrate. If the
condition never fires, the boundary never hydrates and its code is never
fetched.

The two compose. A `Hydrate` boundary decides whether and when React
starts hydrating a subtree; once it opens, anything inside it (including
`<Suspense>` boundaries) flows back into React's normal hydration
scheduler. Use `<Suspense>` when hydration must happen and you want React
to prioritize it well. Use `Hydrate` when hydration might not need to
happen at all.

## The Three Decisions

Each `Hydrate` boundary has three performance decisions:

| Decision    | Option     | What it controls                                                   |
| ----------- | ---------- | ------------------------------------------------------------------ |
| Hydration   | `when`     | When the preserved server HTML becomes interactive.                |
| Code split  | `split`    | Whether the children move into a generated deferred child chunk.   |
| Preparation | `prefetch` | Whether work starts before the `when` strategy hydrates the child. |

### `when`: decide when the boundary hydrates

`when` is required. Pass a strategy object for the common case:

```tsx
<Hydrate when={visible()}>
  <Reviews />
</Hydrate>
```

Pass a function when the decision needs browser-only information:

```tsx
import { Hydrate } from '@tanstack/react-start';
import { interaction, visible } from '@tanstack/react-start/hydration';

export function RecommendationsBoundary() {
  return (
    <Hydrate
      when={() =>
        navigator.connection?.saveData
          ? interaction({ events: 'click' })
          : visible()
      }>
      <Recommendations />
    </Hydrate>
  );
}
```

The function form is evaluated only on the client and must synchronously return
a strategy. Use `never()` when you intentionally want the initial server HTML to
stay static.

### `split`: decide whether to create a separate child chunk

By default, `Hydrate` splits the children into a generated child chunk:

```tsx
<Hydrate when={visible()}>
  <HeavyWidget />
</Hydrate>
```

This delays both hydration work and child JavaScript loading.

Set `split={false}` when the child code is small or already needed elsewhere,
and you only want to delay hydration work:

```tsx
import { Hydrate } from '@tanstack/react-start';
import { idle } from '@tanstack/react-start/hydration';

export function SmallWidgetBoundary() {
  return (
    <Hydrate when={idle()} split={false}>
      <SmallWidget />
    </Hydrate>
  );
}
```

### `prefetch`: decide whether to start loading before hydration

`prefetch` starts loading before the boundary hydrates. It has two forms:

| Form                | Example                             | Use it for                                                     |
| ------------------- | ----------------------------------- | -------------------------------------------------------------- |
| Prefetch strategy   | `prefetch={idle()}`                 | Preloading the generated child chunk before hydration.         |
| Procedural prefetch | `prefetch={async (ctx) => { ... }}` | Preloading the child chunk plus data or other async resources. |

Both forms start work early, but they do not change when the boundary becomes
interactive. That is still controlled by `when`.

A prefetch strategy is the small, declarative form:

```tsx
import { idle, interaction, visible } from '@tanstack/react-start/hydration'

<Hydrate when={interaction()} prefetch={idle()}>
  <ProductRecommendations />
</Hydrate>

<Hydrate
  when={interaction()}
  prefetch={visible({ rootMargin: '1200px' })}
>
  <RelatedProducts />
</Hydrate>
```

Strategy-form `prefetch` downloads the generated child chunk before the boundary
hydrates. This can make the later hydration trigger feel faster, because the
browser may already have the chunk by the time `when` resolves. Generated child
chunks only exist when `split` is enabled, so TypeScript rejects strategy-form
`prefetch` when `split={false}`.

Use procedural prefetch when you need custom work:

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { Hydrate } from '@tanstack/react-start';
import { visible } from '@tanstack/react-start/hydration';

function DeferredReviews() {
  const queryClient = useQueryClient();

  return (
    <Hydrate
      when={visible()}
      prefetch={async ({ preload }) => {
        await preload();
        await queryClient.prefetchQuery(reviewsQueryOptions);
      }}>
      <Reviews />
    </Hydrate>
  );
}
```

Procedural prefetch also works with `split={false}`. In that case, `preload()`
is a resolved no-op, but the function can still prepare data or other
resources.

## Common Recipes

### Hydrate below-the-fold SSR content

```tsx
import { Hydrate } from '@tanstack/react-start';
import { visible } from '@tanstack/react-start/hydration';

export function ProductPage() {
  return (
    <>
      <ProductHero />
      <BuyBox />

      <Hydrate when={visible({ rootMargin: '800px' })}>
        <Reviews />
      </Hydrate>
    </>
  );
}
```

Use a positive `rootMargin` when the boundary should hydrate before it actually
enters the viewport.

### Download the child chunk before it is needed

```tsx
import { Hydrate } from '@tanstack/react-start';
import { idle, visible } from '@tanstack/react-start/hydration';

export function ReviewsBoundary() {
  return (
    <Hydrate when={visible({ rootMargin: '200px' })} prefetch={idle()}>
      <Reviews />
    </Hydrate>
  );
}
```

This keeps the boundary non-interactive until it is close to the viewport, but
starts loading the child chunk during idle time.

### Keep a widget cold until user intent

```tsx
import { Hydrate } from '@tanstack/react-start';
import { interaction, visible } from '@tanstack/react-start/hydration';

export function RecommendationsBoundary() {
  return (
    <Hydrate
      when={interaction({ events: ['focusin', 'click'] })}
      prefetch={visible({ rootMargin: '1200px' })}>
      <RecommendationCarousel />
    </Hydrate>
  );
}
```

This is useful for expensive controls that are visible or nearby, but only
matter when the user reaches for them.

### Delay hydration without code splitting

```tsx
import { Hydrate } from '@tanstack/react-start';
import { idle } from '@tanstack/react-start/hydration';

export function BadgeBoundary() {
  return (
    <Hydrate when={idle()} split={false}>
      <SmallPersonalizedBadge />
    </Hydrate>
  );
}
```

Use this when the JavaScript is already part of the startup bundle or when a
separate child chunk would not be worth it.

### Keep initial SSR HTML static

```tsx
import { Hydrate } from '@tanstack/react-start';
import { never } from '@tanstack/react-start/hydration';

export function MarketingPage() {
  return (
    <Hydrate when={never()}>
      <StaticTrustBadges />
    </Hydrate>
  );
}
```

`never()` preserves the existing server HTML and does not hydrate the boundary
during initial document hydration. If the same boundary mounts later during
client-side navigation, it renders normally because there is no initial server
HTML to preserve. `never()` cannot be used as a prefetch strategy.

### Reuse Hydrate props

Use `HydrateOptions` for reusable objects that you spread into `Hydrate`:

```tsx
import { Hydrate } from '@tanstack/react-start';
import type { HydrateOptions } from '@tanstack/react-start';
import { visible } from '@tanstack/react-start/hydration';

const belowFoldProps = {
  when: () => visible({ rootMargin: '800px' }),
} satisfies HydrateOptions;

export function Page() {
  return (
    <Hydrate
      {...belowFoldProps}
      prefetch={async ({ preload }) => {
        await preload();
      }}>
      <Widget />
    </Hydrate>
  );
}
```

Inline `when` and `prefetch` functions are supported. You do not need to wrap
them in `useCallback`; TanStack Start keeps the latest callback internally and
does not re-register hydration listeners just because a function identity
changed. If the meaning of a boundary changes, use a normal React `key` to
create a new boundary.

## Hydrate Props Reference

`Hydrate` accepts these props:

| Prop         | Type                                                     | Notes                                                                                                                                                     |
| ------------ | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `when`       | `HydrationStrategy \| () => HydrationStrategy`           | Required. Controls when the boundary hydrates. Function form is client-only and synchronous.                                                              |
| `prefetch`   | `HydrationPrefetchStrategy \| HydrationPrefetchFunction` | Optional. Strategy form preloads the split child chunk. Function form can preload chunks, data, or other resources, and can be used with `split={false}`. |
| `split`      | `boolean`                                                | Defaults to `true`. Set literal `false` to disable compiler extraction and only defer hydration work.                                                     |
| `fallback`   | `ReactNode`                                              | Client-only loading UI for boundaries that mount after the app has already hydrated and then suspend on the child chunk or child `Suspense`.              |
| `onHydrated` | `() => void`                                             | Fires once after the boundary has hydrated on the client.                                                                                                 |

## Strategy Reference

Import strategies from `@tanstack/react-start/hydration`.

| Strategy        | Behavior                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------ |
| `load()`        | Hydrates as soon as the app hydrates.                                                      |
| `idle()`        | Hydrates in `requestIdleCallback`, or after `timeout` when idle callbacks are unavailable. |
| `visible()`     | Hydrates when the boundary marker enters the viewport.                                     |
| `media()`       | Hydrates when the media query matches.                                                     |
| `interaction()` | Hydrates on configured interaction intent events.                                          |
| `condition()`   | Hydrates once the condition is truthy.                                                     |
| `never()`       | Never hydrates the initial server-rendered boundary.                                       |

Strategy options:

| Strategy      | Options                                                                                 |
| ------------- | --------------------------------------------------------------------------------------- |
| `idle`        | `{ timeout?: number }`, defaults to `2000`.                                             |
| `visible`     | `{ rootMargin?: string; threshold?: number \| Array<number> }`, default margin `600px`. |
| `media`       | Query string, for example `media('(min-width: 800px)')`.                                |
| `interaction` | `{ events?: supported event or readonly array of supported events }`.                   |
| `condition`   | Boolean or boolean-returning function.                                                  |

Supported interaction events are `auxclick`, `click`, `contextmenu`,
`dblclick`, `focusin`, `keydown`, `keyup`, `mousedown`, `mouseenter`,
`mouseover`, `mouseup`, `pointerdown`, `pointerenter`, `pointerover`, and
`pointerup`.

The default `interaction()` event list is `pointerenter`, `focusin`,
`pointerdown`, and `click`. Use `events` when a boundary should listen to a
different event or a smaller set:

```tsx
import { Hydrate } from '@tanstack/react-start'
import { interaction } from '@tanstack/react-start/hydration'

<Hydrate when={interaction({ events: 'dblclick' })}>
  <PreviewEditor />
</Hydrate>

<Hydrate when={interaction({ events: ['contextmenu', 'dblclick'] })}>
  <ContextMenuEditor />
</Hydrate>
```

After a `condition()` boundary hydrates, it stays hydrated even if the condition
later becomes false:

```tsx
import { Hydrate } from '@tanstack/react-start';
import { condition } from '@tanstack/react-start/hydration';

export function CartRecommendationsBoundary() {
  return (
    <Hydrate when={condition(isCartOpen)}>
      <CartRecommendations />
    </Hydrate>
  );
}
```

## Prefetch Reference

Procedural prefetch receives a context object:

| Property            | Meaning                                                                                 |
| ------------------- | --------------------------------------------------------------------------------------- |
| `preload()`         | Loads the compiler-generated child chunk. It resolves immediately when `split={false}`. |
| `waitFor(strategy)` | Waits for a prefetch strategy, the hydration trigger, or abort.                         |
| `signal`            | `AbortSignal` for cancelable async work such as `fetch`.                                |
| `element`           | Boundary marker element for custom observers or DOM measurements.                       |

`waitFor(strategy)` resolves with:

| Result       | Meaning                                                             |
| ------------ | ------------------------------------------------------------------- |
| `'prefetch'` | The supplied prefetch strategy resolved normally.                   |
| `'hydrate'`  | The boundary's hydration trigger fired first. Do required work now. |
| `'abort'`    | The boundary unmounted or the prefetch lifecycle was abandoned.     |

The promise returned from procedural prefetch is meaningful. Awaited work blocks
hydration if the `when` strategy resolves before the prefetch function
finishes:

```tsx
<Hydrate
  when={visible()}
  prefetch={async ({ preload }) => {
    await preload();
  }}>
  <Widget />
</Hydrate>
```

Fire-and-forget work does not block hydration:

```tsx
<Hydrate
  when={visible()}
  prefetch={({ preload }) => {
    void preload();
  }}>
  <Widget />
</Hydrate>
```

Use this distinction deliberately. Await when the resource is required for the
first hydrated render. Fire and forget when the resource is only a helpful
head start.

## Fallbacks

`fallback` is not the placeholder for the initial server-rendered HTML. On the
initial page load, TanStack Start keeps the existing server HTML in place until
the boundary hydrates:

```tsx
<Hydrate when={visible()} fallback={<ReviewsSkeleton />}>
  <Reviews />
</Hydrate>
```

In that example, if `Reviews` was present in the initial HTML document, users
see the server-rendered reviews. They do not see `ReviewsSkeleton` while the
boundary is waiting for `visible()`.

`fallback` is used when the boundary first appears after the app is already
running and there is no existing server HTML for that boundary. Common examples
include client-side navigation, conditionally showing a panel, or opening a tab
whose contents were not in the initial document. In those cases, the boundary
renders on the client, and `fallback` can show while the generated child chunk
or a child `Suspense` is still loading.

With `never()`, initial server HTML remains static and `fallback` is not used.

The compiler removes statically visible `fallback` props from the server bundle.
Prefer passing `fallback` directly, in an inline object spread, or through a
single-use `const` object spread so server builds can strip that UI.

## Correctness And Updates

Deferred hydration is a performance hint for React's initial hydration work.
React may hydrate a deferred boundary earlier than its strategy would normally
allow if state, props, context, or store updates outside the boundary require
React to reconcile inside it before the gate opens. This preserves correctness
and avoids showing stale server HTML after the surrounding app has changed.

`never()` is the exception for initial document hydration. Treat it as
intentionally static SSR HTML. Do not rely on parent updates to make a `never()`
boundary interactive. If the same boundary mounts later during client-side
navigation, it renders normally.

## Nested Boundaries

Nested boundaries hydrate parent-first. A child boundary can only hydrate after
its ancestor boundaries have hydrated. That means non-interaction child
strategies such as `visible`, `media`, `idle`, or `condition` cannot run while
their parent boundary is still dehydrated.

For example, a product page might defer the whole reviews section until it is
near the viewport, while keeping heavier review tools cold until the user
interacts with them:

```tsx
import { Hydrate } from '@tanstack/react-start';
import { interaction, visible } from '@tanstack/react-start/hydration';

export function ProductPage() {
  return (
    <>
      <ProductHero />
      <BuyBox />

      <Hydrate when={visible({ rootMargin: '600px' })}>
        <section aria-labelledby='reviews-heading'>
          <h2 id='reviews-heading'>Reviews</h2>
          <ReviewsSummary />
          <ReviewsList />

          <Hydrate when={interaction({ events: ['focusin', 'click'] })}>
            <ReviewFilters />
          </Hydrate>

          <Hydrate when={interaction({ events: 'click' })}>
            <WriteReviewForm />
          </Hydrate>
        </section>
      </Hydrate>
    </>
  );
}
```

In this example, scrolling near the reviews hydrates the parent first. Only
after that can the nested interaction boundaries hydrate from focus or click.

Interaction intent can also resolve an unresolved ancestor chain when the
ancestor is itself waiting for interaction:

```tsx
<Hydrate when={interaction({ events: ['focusin', 'click'] })}>
  <section aria-label='Review tools'>
    <ReviewSortSummary />

    <Hydrate when={interaction({ events: 'click' })}>
      <WriteReviewForm />
    </Hydrate>
  </section>
</Hydrate>
```

If the first meaningful intent is a click inside `WriteReviewForm`, TanStack
Start hydrates the unresolved parent chain and then redispatches a same-type
event for the target boundary. Native listener payload details such as pointer
coordinates are not guaranteed to be preserved. A `never()` ancestor still wins
during initial hydration, so descendants under it remain non-interactive.

## Preloading And CSS

Transformed `Hydrate` JavaScript chunks are not modulepreloaded with the route.
Without `prefetch`, the child chunk loads when the split boundary is ready to
render. If that import suspends during client-side navigation or another
client-only mount, the boundary's `fallback` is shown.

CSS used by split, deferred, and `never()` boundaries is linked in the SSR HTML
for the matched route. It is not deferred with the generated child JavaScript
chunk, because the server-rendered HTML may need those styles before any
JavaScript runs. This is route-level asset linking: if a route module contains a
deferred boundary that imports CSS, that stylesheet can be linked for the route
even when that boundary is hidden behind conditional rendering and does not
appear in a particular response.

## Extraction Limits

Compiler-backed `Hydrate` splitting works by moving the boundary's children into
a generated virtual module and rendering them through a lazy component. That
gives TanStack Start a separate child chunk to load later, but it also means the
compiler must be able to move the JSX safely.

Keep the component you want to split directly inside `Hydrate`. If you hide it
behind opaque `children` props, the compiler cannot statically extract those
children into a generated child chunk at the usage site.

The split boundary must use a statically imported `Hydrate` component from
`@tanstack/react-start`. Renaming that import is supported:

```tsx
import { Hydrate as Deferred } from '@tanstack/react-start';

export function ProductPage() {
  return (
    <Deferred when={visible()}>
      <Reviews />
    </Deferred>
  );
}
```

Assigning `Hydrate` to another component variable is not analyzed for splitting:

```tsx
import { Hydrate } from '@tanstack/react-start'

const Deferred = Hydrate

<Deferred when={visible()}>
  <Reviews />
</Deferred>
```

Render the imported `Hydrate` tag directly, use an import rename, or set
`split={false}` when you need component indirection.

Use the literal prop `split={false}` to opt out of extraction. Dynamic values
such as `split={shouldSplit}` cannot be used to opt out at compile time.

These patterns cannot be split:

| Pattern                                  | Why it is rejected                                                                 | What to do instead                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Function-as-children                     | The compiler cannot move a render function and preserve the expected call pattern. | Use `split={false}` or move the rendered UI into a child component.                  |
| Hook calls directly inside extracted JSX | Moving that JSX would move where the hook executes.                                | Move the hook call into a component inside the boundary, then render that component. |
| `this` captures                          | Extracted function components cannot safely preserve class instance context.       | Wrap the UI in a function component or use `split={false}`.                          |
| `super` captures                         | Extracted function components cannot preserve superclass access.                   | Wrap the UI in a function component or use `split={false}`.                          |

This fails because `useThing()` would be moved into the generated component:

```tsx
<Hydrate when={idle()}>
  <p>{useThing()}</p>
</Hydrate>
```

Move the hook into a component instead:

```tsx
function ThingText() {
  const thing = useThing();
  return <p>{thing}</p>;
}

export function ProductPage() {
  return (
    <Hydrate when={idle()}>
      <ThingText />
    </Hydrate>
  );
}
```

Values captured from the surrounding component can be passed into the generated
child component, but keep the boundary simple. If extraction starts forcing
complicated data flow, prefer a named child component and put the logic there.

`fallback` stripping is intentionally conservative. The server build can strip
directly passed fallback UI, inline object-spread fallback UI, and single-use
`const` object-spread fallback UI. If fallback props are hidden behind dynamic
spreads or shared objects, the compiler may keep them.

You can extract reusable `when` and `prefetch` helpers today, but avoid hiding
split boundaries behind plain wrapper components if you need child code
splitting. A wrapper can defer hydration at runtime, but the compiler cannot
reliably move call-site children into a separate chunk through arbitrary
component indirection.

---

id: selective-ssr
title: Selective Server-Side Rendering (SSR)

---

## What is Selective SSR?

In TanStack Start, routes matching the initial request are rendered on the server by default. This means `beforeLoad` and `loader` are executed on the server, followed by rendering the route components. The resulting HTML is sent to the client, which hydrates the markup into a fully interactive application.

However, there are cases where you might want to disable SSR for certain routes or all routes, such as:

- When `beforeLoad` or `loader` requires browser-only APIs (e.g., `localStorage`).
- When the route component depends on browser-only APIs (e.g., `canvas`).

TanStack Start's Selective SSR feature lets you configure:

- Which routes should execute `beforeLoad` or `loader` on the server.
- Which route components should be rendered on the server.

## How does this compare to SPA mode?

TanStack Start's [SPA mode](./spa-mode) completely disables server-side execution of `beforeLoad` and `loader`, as well as server-side rendering of route components. Selective SSR allows you to configure server-side handling on a per-route basis, either statically or dynamically.

## Configuration

You can control how a route is handled during the initial server request using the `ssr` property. If this property is not set, it defaults to `true`. You can change this default using the `defaultSsr` option in `createStart`:

```tsx
// src/start.ts
import { createStart } from '@tanstack/react-start';

export const startInstance = createStart(() => ({
  // Disable SSR by default
  defaultSsr: false,
}));
```

### `ssr: true`

This is the default behavior unless otherwise configured. On the initial request, it will:

- Run `beforeLoad` on the server and send the resulting context to the client.
- Run `loader` on the server and send the loader data to the client.
- Render the component on the server and send the HTML markup to the client.

```tsx
// src/routes/posts/$postId.tsx
export const Route = createFileRoute('/posts/$postId')({
  ssr: true,
  beforeLoad: () => {
    console.log('Executes on the server during the initial request');
    console.log('Executes on the client for subsequent navigation');
  },
  loader: () => {
    console.log('Executes on the server during the initial request');
    console.log('Executes on the client for subsequent navigation');
  },
  component: () => <div>This component is rendered on the server</div>,
});
```

### `ssr: false`

This disables server-side:

- Execution of the route's `beforeLoad` and `loader`.
- Rendering of the route component.

```tsx
// src/routes/posts/$postId.tsx
export const Route = createFileRoute('/posts/$postId')({
  ssr: false,
  beforeLoad: () => {
    console.log('Executes on the client during hydration');
  },
  loader: () => {
    console.log('Executes on the client during hydration');
  },
  component: () => <div>This component is rendered on the client</div>,
});
```

### `ssr: 'data-only'`

This hybrid option will:

- Run `beforeLoad` on the server and send the resulting context to the client.
- Run `loader` on the server and send the loader data to the client.
- Disable server-side rendering of the route component.

```tsx
// src/routes/posts/$postId.tsx
export const Route = createFileRoute('/posts/$postId')({
  ssr: 'data-only',
  beforeLoad: () => {
    console.log('Executes on the server during the initial request');
    console.log('Executes on the client for subsequent navigation');
  },
  loader: () => {
    console.log('Executes on the server during the initial request');
    console.log('Executes on the client for subsequent navigation');
  },
  component: () => <div>This component is rendered on the client</div>,
});
```

### Functional Form

For more flexibility, you can use the functional form of the `ssr` property to decide at runtime whether to SSR a route:

```tsx
// src/routes/docs/$docType/$docId.tsx
export const Route = createFileRoute('/docs/$docType/$docId')({
  validateSearch: z.object({ details: z.boolean().optional() }),
  ssr: ({ params, search }) => {
    if (params.status === 'success' && params.value.docType === 'sheet') {
      return false;
    }
    if (search.status === 'success' && search.value.details) {
      return 'data-only';
    }
  },
  beforeLoad: () => {
    console.log('Executes on the server depending on the result of ssr()');
  },
  loader: () => {
    console.log('Executes on the server depending on the result of ssr()');
  },
  component: () => <div>This component is rendered on the client</div>,
});
```

The `ssr` function runs only on the server during the initial request and is stripped from the client bundle.

`search` and `params` are passed in after validation as a discriminated union:

```tsx
params:
    | { status: 'success'; value: Expand<ResolveAllParamsFromParent<TParentRoute, TParams>> }
    | { status: 'error'; error: unknown }
search:
    | { status: 'success'; value: Expand<ResolveFullSearchSchema<TParentRoute, TSearchValidator>> }
    | { status: 'error'; error: unknown }
```

If validation fails, `status` will be `error` and `error` will contain the failure details. Otherwise, `status` will be `success` and `value` will contain the validated data.

### Inheritance

At runtime, a child route inherits the Selective SSR configuration of its parent. However, the inherited value can only be changed to be more restrictive (i.e. `true` to `data-only` or `false` and `data-only` to `false`). For example:

```tsx
root { ssr: undefined }
  posts { ssr: false }
     $postId { ssr: true }
```

- `root` defaults to `ssr: true`.
- `posts` explicitly sets `ssr: false`, so neither `beforeLoad` nor `loader` will run on the server, and the route component won't be rendered on the server.
- `$postId` sets `ssr: true`, but inherits `ssr: false` from its parent. Because the inherited value can only be changed to be more restrictive, `ssr: true` has no effect and the inherited `ssr: false` will remain.

Another example:

```tsx
root { ssr: undefined }
  posts { ssr: 'data-only' }
     $postId { ssr: true }
       details { ssr: false }
```

- `root` defaults to `ssr: true`.
- `posts` sets `ssr: 'data-only'`, so `beforeLoad` and `loader` run on the server, but the route component isn't rendered on the server.
- `$postId` sets `ssr: true`, but inherits `ssr: 'data-only'` from its parent.
- `details` sets `ssr: false`, so neither `beforeLoad` nor `loader` will run on the server, and the route component won't be rendered on the server. Here the inherited value is changed to be more restrictive, and therefore, the `ssr: false` will override the inherited value.

## Fallback Rendering

For the first route with `ssr: false` or `ssr: 'data-only'`, the server will render the route's `pendingComponent` as a fallback. If `pendingComponent` isn't configured, the `defaultPendingComponent` will be rendered. If neither is configured, no fallback will be rendered.

On the client during hydration, this fallback will be displayed for at least `minPendingMs` (or `defaultPendingMinMs` if not configured), even if the route doesn't have `beforeLoad` or `loader` defined.

## How to disable SSR of the root route?

You can disable server side rendering of the root route component, however the `<html>` shell still needs to be rendered on the server. This shell is configured via the `shellComponent` property and takes a single property `children`. The `shellComponent` is always SSRed and is wrapping around the root `component`, the root `errorComponent` or the root `notFound` component respectively.

A minimal setup of a root route with disabled SSR for the route component looks like this:

```tsx
import * as React from 'react';

import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router';

export const Route = createRootRoute({
  shellComponent: RootShell,
  component: RootComponent,
  errorComponent: () => <div>Error</div>,
  notFoundComponent: () => <div>Not found</div>,
  ssr: false, // or `defaultSsr: false` on the router
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <div>
      <h1>This component will be rendered on the client</h1>
      <Outlet />
    </div>
  );
}
```

---

id: spa-mode
title: SPA mode

---

## What the heck is SPA mode?

For applications that do not require SSR for either SEO, crawlers, or performance reasons, it may be desirable to ship static HTML to your users containing the "shell" of your application (or even prerendered HTML for specific routes) that contain the necessary `html`, `head`, and `body` tags to bootstrap your application only on the client.

## Why use Start without SSR?

**No SSR doesn't mean giving up server-side features!** SPA modes actually pair very nicely with server-side features like server functions and/or server routes or even other external APIs. It **simply means that the initial document will not contain the fully rendered HTML of your application until it has been rendered on the client using JavaScript**.

## Benefits of SPA mode

- **Easier to deploy** - A CDN that can serve static assets is all you need.
- **Cheaper** to host - CDNs are cheap compared to Lambda functions or long-running processes.
- **Client-side Only is simpler** - No SSR means less to go wrong with hydration, rendering, and routing.

## Caveats of SPA mode

- **Slower time to full content** - Time to full content is longer since all JS must download and execute before anything below the shell can be rendered.
- **Less SEO friendly** - Robots, crawlers and link unfurlers _may_ have a harder time indexing your application unless they are configured to execute JS and your application can render within a reasonable amount of time.

## How does it work?

After enabling the SPA mode, running a Start build will have an additional prerendering step afterwards to generate the shell. This is done by:

- **Prerendering** your application's **root route only**
- Where your application would normally render your matched routes, your router's configured **pending fallback component is rendered instead**.
- The resulting HTML is stored to a static HTML page called `/_shell.html` (configurable)
- Default rewrites are configured to redirect all 404 requests to the SPA mode shell

> [!NOTE]
> Other routes may also be prerendered and it is recommended to prerender as much as you can in SPA mode, but this is not required for SPA mode to work.

## Configuring SPA mode

To configure SPA mode, there are a few options you can add to your Start plugin's options:

<!-- ::start:tabs variant="bundler" -->

# Vite

```ts title="vite.config.ts"
export default defineConfig({
  plugins: [
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
  ],
});
```

# Rsbuild

```ts title="rsbuild.config.ts"
export default defineConfig({
  plugins: [
    tanstackStart({
      spa: {
        enabled: true,
      },
    }),
  ],
});
```

<!-- ::end:tabs -->

## Use Necessary Redirects

Deploying a purely client-side SPA to a host or CDN often requires the use of redirects to ensure that urls are properly rewritten to the SPA shell. The goal of any deployment should include these priorities in this order:

1. Ensure that static assets will always be served if they exist, e.g. /about.html. This is usually the default behavior for most CDNs
2. (Optional) Allow-list specific subpaths to be routed through to any dynamic server handlers, e.g. /api/\*\* (More on this below)
3. Ensure that all 404 requests are rewritten to the SPA shell, e.g. a catch-all redirect to /\_shell.html (or if you have configured your shell output path to be something custom, use that instead)

## Basic Redirects Example

Let's use Netlify's `_redirects` file to rewrite all 404 requests to the SPA shell.

```
# Catch all other 404 requests and rewrite them to the SPA shell
/* /_shell.html 200
```

## Allowing Server Functions and Server Routes

Again, using Netlify's `_redirects` file, we can allow-list specific subpaths to be routed through to the server.

```
# Allow requests to /_serverFn/* to be routed through to the server (If you have configured your server function base path to be something other than /_serverFn, use that instead)
/_serverFn/* /_serverFn/:splat 200

# Allow any requests to /api/* to be routed through to the server (Server routes can be created at any path, so you must ensure that any server routes you want to use are under this path, or simply add additional redirects for each server route base you want to expose)
/api/* /api/:splat 200

# Catch all other 404 requests and rewrite them to the SPA shell
/* /_shell.html 200
```

## Shell Mask Path

The default pathname used to generate the SPA shell is `/`. We call this the **shell mask path**. Since matched routes are not included, the pathname used to generate the shell is mostly irrelevant, but it's still configurable.

> [!NOTE]
> It's recommended to keep the default value of `/` as the shell mask path.

<!-- ::start:tabs variant="bundler" -->

# Vite

```ts title="vite.config.ts"
export default defineConfig({
  plugins: [
    tanstackStart({
      spa: {
        maskPath: '/app',
      },
    }),
  ],
});
```

# Rsbuild

```ts title="rsbuild.config.ts"
export default defineConfig({
  plugins: [
    tanstackStart({
      spa: {
        maskPath: '/app',
      },
    }),
  ],
});
```

<!-- ::end:tabs -->

## Prerendering Options

The prerender option is used to configure the prerendering behavior of the SPA shell, and accepts the same prerender options as found in our prerendering guide.

**By default, the following `prerender` options are set:**

- `outputPath`: `/_shell.html`
- `crawlLinks`: `false`
- `retryCount`: `0`

This means that by default, the shell will not be crawled for links to follow for additional prerendering, and will not retry prerendering fails.

You can always override these options by providing your own prerender options:

<!-- ::start:tabs variant="bundler" -->

# Vite

```ts title="vite.config.ts"
export default defineConfig({
  plugins: [
    tanstackStart({
      spa: {
        prerender: {
          outputPath: '/custom-shell',
          crawlLinks: true,
          retryCount: 3,
        },
      },
    }),
  ],
});
```

# Rsbuild

```ts title="rsbuild.config.ts"
export default defineConfig({
  plugins: [
    tanstackStart({
      spa: {
        prerender: {
          outputPath: '/custom-shell',
          crawlLinks: true,
          retryCount: 3,
        },
      },
    }),
  ],
});
```

<!-- ::end:tabs -->

## Customized rendering in SPA mode

Customizing the HTML output of the SPA shell can be useful if you want to:

- Provide generic head tags for SPA routes
- Provide a custom pending fallback component
- Change literally anything about the shell's HTML, CSS, and JS

To make this process simple, an `isShell()` function can be found on the `router` instance:

```tsx
// src/routes/root.tsx
export default function Root() {
  const isShell = useRouter().isShell();

  if (isShell) console.log('Rendering the shell!');
}
```

You can use this boolean to conditionally render different UI based on whether the current route is a shell or not, but keep in mind that after hydrating the shell, the router will immediately navigate to the first route and `isShell()` will return `false`. **This could produce flashes of unstyled content if not handled properly.**

## Dynamic Data in your Shell

Since the shell is prerendered using the SSR build of your application, any `loader`s, or server-specific functionality defined on your **Root Route** will run during the prerendering process and the data will be included in the shell.

This means that you can use dynamic data in your shell by using a `loader` or server-specific functionality.

```tsx
// src/routes/__root.tsx

export const RootRoute = createRootRoute({
  loader: async () => {
    return {
      name: 'Tanner',
    };
  },
  component: Root,
});

export default function Root() {
  const { name } = useLoaderData();

  return (
    <html>
      <body>
        <h1>Hello, {name}!</h1>
        <Outlet />
      </body>
    </html>
  );
}
```

---

id: static-prerendering
title: Static Prerendering

---

Static prerendering is the process of generating static HTML files for your application. This can be useful for either improving the performance of your application, as it allows you to serve pre-rendered HTML files to users without having to generate them on the fly or for deploying static sites to platforms that do not support server-side rendering.

## Prerendering

TanStack Start can prerender your application to static HTML files, which can then be served to users without having to generate them on the fly. To prerender your application, you can add the `prerender` option to your `tanstackStart` configuration:

<!-- ::start:tabs variant="bundler" -->

# Vite

```ts title="vite.config.ts"
import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    tanstackStart({
      prerender: {
        // Switch to true to enable prerendering
        enabled: false,

        // Disable if you need pages to be at `/page.html` instead of `/page/index.html`
        autoSubfolderIndex: true,

        // If disabled, only the root path or the paths defined in the pages config will be prerendered
        autoStaticPathsDiscovery: true,

        // How many prerender jobs to run at once
        concurrency: 14,

        // Whether to extract links from the HTML and prerender them also
        crawlLinks: true,

        // Filter function takes the page object and returns whether it should prerender
        filter: ({ path }) => !path.startsWith('/do-not-render-me'),

        // Number of times to retry a failed prerender job
        retryCount: 2,

        // Delay between retries in milliseconds
        retryDelay: 1000,

        // Maximum number of redirects to follow during prerendering
        maxRedirects: 5,

        // Fail if an error occurs during prerendering
        failOnError: true,

        // Callback when page is successfully rendered
        onSuccess: ({ page }) => {
          console.log(`Rendered ${page.path}!`);
        },
      },
      // Optional configuration for specific pages
      // Note: When autoStaticPathsDiscovery is enabled (default), discovered static
      // routes will be merged with the pages specified below
      pages: [
        {
          path: '/my-page',
          prerender: { enabled: true, outputPath: '/my-page/index.html' },
        },
      ],
    }),
    viteReact(),
  ],
});
```

# Rsbuild

```ts title="rsbuild.config.ts"
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/rsbuild';

export default defineConfig({
  plugins: [
    pluginReact(),
    tanstackStart({
      prerender: {
        // Switch to true to enable prerendering
        enabled: false,

        // Disable if you need pages to be at `/page.html` instead of `/page/index.html`
        autoSubfolderIndex: true,

        // If disabled, only the root path or the paths defined in the pages config will be prerendered
        autoStaticPathsDiscovery: true,

        // How many prerender jobs to run at once
        concurrency: 14,

        // Whether to extract links from the HTML and prerender them also
        crawlLinks: true,

        // Filter function takes the page object and returns whether it should prerender
        filter: ({ path }) => !path.startsWith('/do-not-render-me'),

        // Number of times to retry a failed prerender job
        retryCount: 2,

        // Delay between retries in milliseconds
        retryDelay: 1000,

        // Maximum number of redirects to follow during prerendering
        maxRedirects: 5,

        // Fail if an error occurs during prerendering
        failOnError: true,

        // Callback when page is successfully rendered
        onSuccess: ({ page }) => {
          console.log(`Rendered ${page.path}!`);
        },
      },
      // Optional configuration for specific pages
      // Note: When autoStaticPathsDiscovery is enabled (default), discovered static
      // routes will be merged with the pages specified below
      pages: [
        {
          path: '/my-page',
          prerender: { enabled: true, outputPath: '/my-page/index.html' },
        },
      ],
    }),
  ],
});
```

<!-- ::end:tabs -->

## Automatic Static Route Discovery

All static paths will be automatically discovered and seamlessly merged with the specified `pages` config

Routes are excluded from automatic discovery in the following cases:

- Routes with path parameters (e.g., `/users/$userId`) since they require specific parameter values
- Layout routes (prefixed with `_`) since they don't render standalone pages
- Routes without components (e.g., API routes)

Note: Dynamic routes can still be prerendered if they are linked from other pages when `crawlLinks` is enabled.

## Crawling Links

When `crawlLinks` is enabled (default: `true`), TanStack Start will extract links from prerendered pages and prerender those linked pages as well.

For example, if `/` contains a link to `/posts`, then `/posts` will also be automatically prerendered.

---

id: isr
title: Incremental Static Regeneration (ISR)

---

Incremental Static Regeneration (ISR) allows you to serve statically generated content from a CDN while periodically regenerating it in the background. This gives you the performance benefits of static sites with the freshness of dynamic content.

## How ISR Works in TanStack Start

TanStack Start's approach to ISR is flexible and leverages standard HTTP cache headers that work with any CDN. Unlike framework-specific ISR implementations, this approach gives you full control over caching behavior at both the page and data level.

The core concept is simple:

1. **Static Prerendering**: Pages are generated at build time
2. **CDN Caching**: Cache headers control how long CDNs cache the HTML
3. **Revalidation**: After the cache expires, the next request triggers regeneration
4. **Stale-While-Revalidate**: Serve stale content while fetching fresh data in the background

## Cache Header Strategies

### Time-Based Revalidation

The most common ISR pattern uses the `Cache-Control` header with `max-age` and `s-maxage` directives:

<!-- ::start:tabs variant="bundler" -->

# Vite

```ts title="vite.config.ts"
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tanstackStart({
      prerender: {
        routes: ['/blog', '/blog/posts/*'],
        crawlLinks: true,
      },
    }),
  ],
});
```

# Rsbuild

```ts title="rsbuild.config.ts"
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/rsbuild';

export default defineConfig({
  plugins: [
    pluginReact(),
    tanstackStart({
      prerender: {
        routes: ['/blog', '/blog/posts/*'],
        crawlLinks: true,
      },
    }),
  ],
});
```

<!-- ::end:tabs -->

```tsx
// routes/blog/posts/$postId.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/blog/posts/$postId')({
  loader: async ({ params }) => {
    const post = await fetchPost(params.postId);
    return { post };
  },
  headers: () => ({
    // Cache at CDN for 1 hour, allow stale content for up to 1 day
    'Cache-Control':
      'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
  }),
});

export default function BlogPost() {
  const { post } = Route.useLoaderData();
  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
    </article>
  );
}
```

### Understanding Cache-Control Directives

- **`public`**: Response can be cached by any cache (CDN, browser, etc.)
- **`max-age=3600`**: Content is fresh for 3600 seconds (1 hour)
- **`s-maxage=3600`**: Overrides max-age for shared caches (CDNs)
- **`stale-while-revalidate=86400`**: Serve stale content while revalidating in background for up to 24 hours
- **`immutable`**: Content never changes (use for hash-based assets)

## ISR with Server Functions

Server functions can also set cache headers for dynamic data endpoints:

```tsx
// routes/api/products/$productId.ts
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/products/$productId')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const product = await db.products.findById(params.productId);

        return Response.json(
          { product },
          {
            headers: {
              'Cache-Control':
                'public, max-age=300, stale-while-revalidate=600',
              'CDN-Cache-Control': 'max-age=3600', // Cloudflare-specific
            },
          },
        );
      },
    },
  },
});
```

### Using Middleware for Cache Headers

For API routes, you can use middleware to set cache headers:

```tsx
// routes/api/products/$productId.ts
import { createFileRoute } from '@tanstack/react-router';
import { createMiddleware } from '@tanstack/react-start';

const cacheMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();

  // Add cache headers to the response
  result.response.headers.set(
    'Cache-Control',
    'public, max-age=3600, stale-while-revalidate=86400',
  );

  return result;
});

export const Route = createFileRoute('/api/products/$productId')({
  server: {
    middleware: [cacheMiddleware],
    handlers: {
      GET: async ({ params }) => {
        const product = await db.products.findById(params.productId);
        return Response.json({ product });
      },
    },
  },
});
```

For page routes, it's simpler to use the `headers` property directly:

```tsx
// routes/blog/posts/$postId.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/blog/posts/$postId')({
  loader: async ({ params }) => {
    const post = await fetchPost(params.postId);
    return { post };
  },
  headers: () => ({
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
  }),
});
```

## On-Demand Revalidation

While time-based revalidation works well for most cases, you may need to invalidate specific pages immediately (e.g., when content is updated):

```tsx
// routes/api/revalidate.ts
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/revalidate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { path, secret } = await request.json();

        // Verify secret token
        if (secret !== process.env.REVALIDATE_SECRET) {
          return Response.json({ error: 'Invalid token' }, { status: 401 });
        }

        // Trigger CDN purge via your CDN's API
        await fetch(
          `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${CF_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              files: [`https://yoursite.com${path}`],
            }),
          },
        );

        return Response.json({ revalidated: true });
      },
    },
  },
});
```

## CDN-Specific Configuration

### Cloudflare Workers

Cloudflare respects standard `Cache-Control` headers and provides additional control:

```tsx
export const Route = createFileRoute('/products/$id')({
  headers: () => ({
    'Cache-Control': 'public, max-age=3600',
    // Cloudflare-specific header for finer control
    'CDN-Cache-Control': 'max-age=7200',
  }),
});
```

### Netlify

Netlify uses `Cache-Control` headers and also supports `_headers` files:

```plaintext
# public/_headers
/blog/*
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400

/api/*
  Cache-Control: public, max-age=300
```

### Vercel

When deploying to Vercel, use their Edge Network cache headers:

```tsx
export const Route = createFileRoute('/posts/$id')({
  headers: () => ({
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
  }),
});
```

## Combining ISR with Client-Side Caching

TanStack Router's built-in cache control works alongside CDN caching:

```tsx
export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => {
    return fetchPost(params.postId);
  },
  // CDN caching (via headers)
  headers: () => ({
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
  }),
  // Client-side caching (via TanStack Router)
  staleTime: 60_000, // Consider data fresh for 60 seconds on client
  gcTime: 5 * 60_000, // Keep in memory for 5 minutes
});
```

This creates a multi-tier caching strategy:

1. **CDN Edge**: 1 hour cache, stale-while-revalidate for 24 hours
2. **Client**: 60 seconds of fresh data, 5 minutes in memory

## Common ISR Patterns

### Blog Posts

```tsx
export const Route = createFileRoute('/blog/$slug')({
  loader: async ({ params }) => fetchPost(params.slug),
  headers: () => ({
    // Cache for 1 hour, allow stale for 7 days
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=604800',
  }),
  staleTime: 5 * 60_000, // 5 minutes client-side
});
```

### E-commerce Product Pages

```tsx
export const Route = createFileRoute('/products/$id')({
  loader: async ({ params }) => fetchProduct(params.id),
  headers: () => ({
    // Shorter cache due to inventory changes
    'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
  }),
  staleTime: 30_000, // 30 seconds client-side
});
```

### Marketing Landing Pages

```tsx
export const Route = createFileRoute('/landing/$campaign')({
  loader: async ({ params }) => fetchCampaign(params.campaign),
  headers: () => ({
    // Long cache for stable content
    'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
  }),
  staleTime: 60 * 60_000, // 1 hour client-side
});
```

### User-Specific Pages

```tsx
export const Route = createFileRoute('/dashboard')({
  loader: async () => fetchUserData(),
  headers: () => ({
    // Private cache, no CDN caching
    'Cache-Control': 'private, max-age=60',
  }),
  staleTime: 30_000,
});
```

## Best Practices

### 1. Start Conservative

Begin with shorter cache times and increase as you understand your content update patterns:

```tsx
// Start here
'Cache-Control': 'public, max-age=300, stale-while-revalidate=600'

// Then move to
'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
```

### 2. Use ETags for Validation

ETags help CDNs efficiently revalidate content:

```tsx
import { createMiddleware } from '@tanstack/react-start';
import crypto from 'crypto';

const etagMiddleware = createMiddleware().server(async ({ next }) => {
  const result = await next();

  // Generate ETag from response content
  const etag = crypto
    .createHash('md5')
    .update(JSON.stringify(result.data))
    .digest('hex');

  result.response.headers.set('ETag', `"${etag}"`);

  return result;
});
```

### 3. Vary Cache by Query Parameters

When content varies by query params, include them in cache keys:

```tsx
export const Route = createFileRoute('/search')({
  headers: () => ({
    'Cache-Control': 'public, max-age=300',
    Vary: 'Accept, Accept-Encoding',
  }),
});
```

### 4. Monitor Cache Hit Rates

Track CDN performance to optimize cache times:

```tsx
const cacheMonitoringMiddleware = createMiddleware().server(
  async ({ next }) => {
    const result = await next();

    // Log cache status (from CDN headers)
    console.log(
      'Cache Status:',
      result.response.headers.get('cf-cache-status'),
    );

    return result;
  },
);
```

### 5. Combine with Static Prerendering

Prerender at build time for instant first load, then use ISR for updates:

<!-- ::start:tabs variant="bundler" -->

# Vite

```ts title="vite.config.ts"
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    tanstackStart({
      prerender: {
        routes: ['/blog', '/blog/posts/*'],
        crawlLinks: true,
      },
    }),
  ],
});
```

# Rsbuild

```ts title="rsbuild.config.ts"
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { tanstackStart } from '@tanstack/react-start/plugin/rsbuild';

export default defineConfig({
  plugins: [
    pluginReact(),
    tanstackStart({
      prerender: {
        routes: ['/blog', '/blog/posts/*'],
        crawlLinks: true,
      },
    }),
  ],
});
```

<!-- ::end:tabs -->

## Debugging ISR

### Check Cache Headers

Use browser DevTools or curl to inspect cache headers:

```bash
curl -I https://yoursite.com/blog/my-post

# Look for:
# Cache-Control: public, max-age=3600, stale-while-revalidate=86400
# Age: 1234 (time in cache)
# X-Cache: HIT (from CDN)
```

### Test Revalidation

Force cache misses to test regeneration:

```bash
# Cloudflare: Bypass cache
curl -H "Cache-Control: no-cache" https://yoursite.com/page

# Or use CDN-specific cache purge APIs
```

### Monitor Performance

Track key metrics:

- **Cache Hit Rate**: Percentage of requests served from cache
- **Revalidation Time**: Time to regenerate stale content
- **Time to First Byte (TTFB)**: Should be low for cached content

## Related Resources

- [Static Prerendering](./static-prerendering.md) - Build-time page generation
- [Hosting](./hosting.md) - CDN deployment configurations
- [Server Functions](./server-functions.md) - Creating dynamic data endpoints
- [Data Loading](../../../../router/guide/data-loading.md) - Client-side cache control
- [Middleware](./middleware.md) - Request/response customization

---

id: server-entry-point
title: Server Entry Point

---

# Server Entry Point

> [!NOTE]
> The server entry point is **optional** out of the box. If not provided, TanStack Start will automatically handle the server entry point for you using the below as a default.

The Server Entry Point supports the universal fetch handler format, commonly used by [Cloudflare Workers](https://developers.cloudflare.com/workers/runtime-apis/handlers/fetch/) and other WinterCG-compatible runtimes.

To ensure interoperability, the default export must conform to our `ServerEntry` interface:

```ts
export default {
  fetch(req: Request, opts?: RequestOptions): Response | Promise<Response> {
    // ...
  },
};
```

TanStack Start exposes a wrapper to make creation type-safe. This is done in the `src/server.ts` file.

```tsx
// src/server.ts
import handler, { createServerEntry } from '@tanstack/react-start/server-entry';

export default createServerEntry({
  fetch(request) {
    return handler.fetch(request);
  },
});
```

Whether we are statically generating our app or serving it dynamically, the `server.ts` file is the entry point for doing all SSR-related work as well as for handling server routes and server function requests.

## Custom Server Handlers

You can create custom server handlers to modify how your application is rendered:

```tsx
// src/server.ts
import {
  createStartHandler,
  defaultStreamHandler,
  defineHandlerCallback,
} from '@tanstack/react-start/server';
import { createServerEntry } from '@tanstack/react-start/server-entry';

const customHandler = defineHandlerCallback((ctx) => {
  // add custom logic here
  return defaultStreamHandler(ctx);
});

const fetch = createStartHandler(customHandler);

export default createServerEntry({
  fetch,
});
```

## Request context

When your server needs to pass additional, typed data into request handlers (for example, authenticated user info, a database connection, or per-request flags), register a request context type via TypeScript module augmentation. The registered context is delivered as the second argument to the server `fetch` handler and is available throughout the server-side middleware chain — including global middleware, request/function middleware, server routes, server functions, and the router itself.

To add types for your request context, augment the `Register` interface from `@tanstack/react-router` with a `server.requestContext` property. The runtime `context` you pass to `handler.fetch` will then match that type. Example:

```tsx
import handler, { createServerEntry } from '@tanstack/react-start/server-entry';

type MyRequestContext = {
  hello: string;
  foo: number;
};

declare module '@tanstack/react-router' {
  interface Register {
    server: {
      requestContext: MyRequestContext;
    };
  }
}

export default createServerEntry({
  async fetch(request) {
    return handler.fetch(request, { context: { hello: 'world', foo: 123 } });
  },
});
```

## Server Configuration

The server entry point is where you can configure server-specific behavior:

- Request/response middleware
- Custom error handling
- Authentication logic
- Database connections
- Logging and monitoring

This flexibility allows you to customize how your TanStack Start application handles server-side rendering while maintaining the framework's conventions.

## Cloudflare Workers

When deploying to Cloudflare Workers, you can extend `server.ts` to handle additional Workers features like queues, scheduled events, and Durable Objects. For a comprehensive guide, see the [Cloudflare Workers documentation for TanStack Start](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/#custom-entrypoints).

---

id: early-hints
title: Early Hints

---

# Early Hints

> **Experimental:** Early Hints are experimental and subject to change.

HTTP `103 Early Hints` lets your server tell the browser about important resources before the final HTML response is ready. TanStack Start can collect route assets and route `head().links`, then call your server entry so your runtime can send `103` responses.

Start does not send Early Hints automatically. Each deployment platform exposes a different API for writing informational responses, so your server entry decides how to send them.

## Choose How to Send Hints

Most apps should choose one of these patterns.

| Goal                              | Use                                             | Tradeoff                                    |
| --------------------------------- | ----------------------------------------------- | ------------------------------------------- |
| Send hints as early as possible   | `phase === 'static'` with `links`               | May send hints for a request that redirects |
| Send only redirect-safe hints     | `phase === 'dynamic'` with `allLinks`           | Runs later, after route loading completes   |
| Let a CDN generate Early Hints    | `responseLinkHeader`                            | Only safe for public, cache-stable links    |
| Support runtimes without HTTP 103 | `responseLinkHeader` as a preload hint fallback | Does not hide server think time like `103`  |

Browsers generally process only the first `103` response for a navigation. Write at most one Early Hints response per request.

## Send Early Hints From Your Server Entry

Add `onEarlyHints` in `src/server.ts`, then pass the serialized `links` to your runtime's Early Hints API.

This example sends the earliest static hints:

```tsx
// src/server.ts
import handler, { createServerEntry } from '@tanstack/react-start/server-entry';

export default createServerEntry({
  fetch(request) {
    return handler.fetch(request, {
      onEarlyHints: ({ phase, links }) => {
        if (phase !== 'static' || !links.length) return;

        // Send `links` with your runtime-specific 103 API.
      },
    });
  },
});
```

Start can call `onEarlyHints` more than once for a request. `links` only contains values that were not emitted in an earlier phase. `allLinks` contains all deduped values collected so far.

## Choose When to Send Hints

`onEarlyHints` can run in two phases.

| Phase     | When it runs                                                  | What it contains                                                                                            |
| --------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `static`  | After route matching, before the router loads the route       | Manifest-managed assets for the matched routes                                                              |
| `dynamic` | After `router.load()` completes, unless the request redirects | Supported links returned by route `head()` functions, or an empty array when all hints were already emitted |

Use `static` when you want the browser to start loading known route assets as soon as possible. Static hints can run before route `beforeLoad` functions, so they may be sent for a request that later redirects.

Use `dynamic` when hints must be redirect-safe or loader-aware. If you want one `103` response that includes both static route assets and dynamic route `head()` links, wait for `dynamic` and send `allLinks`.

```tsx
onEarlyHints: ({ phase, allLinks }) => {
  if (phase !== 'dynamic' || !allLinks.length) return;

  // Send one redirect-safe 103 with static and dynamic links.
  // Use `allLinks` with your runtime-specific 103 API.
};
```

The `dynamic` phase can run with empty `links`, so it can also be used as a post-load signal.

## Add Dynamic Hints From Route Head

Dynamic Early Hints come from supported route `head().links` entries after loaders have run.

```tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/posts/$postId')({
  loader: async ({ params }) => getPost(params.postId),
  head: ({ loaderData }) => ({
    links: [
      {
        rel: 'preload',
        href: loaderData.heroImageUrl,
        as: 'image',
      },
    ],
  }),
});
```

The `dynamic` phase is skipped when `router.load()` produces a redirect.

Route `head().links` entries with `rel: 'stylesheet'` are converted to `rel=preload; as=style` for Early Hints. This includes stylesheets you import with `?url` and return from route `head()`. See [CSS Styling](./css-styling#know-when-css-is-discovered) for how CSS import patterns affect when Start discovers stylesheets.

## Use Response Link Headers as a Fallback

You can also attach collected hints to the final HTML response's HTTP `Link` header.

A response `Link` header does not hide server think time like a `103` response does, but the browser receives it before parsing the HTML body, so it can still start supported preloads and preconnects earlier than it would from HTML alone.

Response `Link` headers are most useful when:

- Your runtime cannot write `103` responses.
- Your CDN can generate Early Hints from response `Link` headers.

Start does not add response `Link` headers automatically. It cannot know whether those headers will be used only by the browser for the current response, stored by a shared cache, or replayed later as CDN-generated Early Hints.

This example appends all collected static and dynamic links to non-redirect HTML responses:

```tsx
// src/server.ts
import handler, { createServerEntry } from '@tanstack/react-start/server-entry';

export default createServerEntry({
  fetch(request) {
    return handler.fetch(request, {
      responseLinkHeader: true,
    });
  },
});
```

## Filter Links Before Sending Them to a CDN

Some CDNs can read response `Link` headers, cache them, and emit their own `103` responses for later requests. For example, [Cloudflare Early Hints](https://developers.cloudflare.com/cache/advanced-configuration/early-hints/) can use `Link` headers from HTML responses.

Only let a shared cache or CDN replay links that are public and cache-stable for the response's cache boundary.

Good links to include are:

- Static route JavaScript and CSS assets.
- Public font, image, style, or fetch preloads with stable URLs.
- Public preconnect origins.

Avoid or filter links when they are:

- Authenticated, private, or user-specific.
- Signed, expiring, or otherwise short-lived.
- Derived from cookies, headers, query strings, A/B tests, or user data, unless the cache key varies on the same inputs.
- Unsafe to replay before your app authorizes the request.

Cloudflare documents several important caveats: its Early Hints cache ignores query strings, it can emit cached hints before reaching your origin or Worker, and it only generates hints from selected final response status codes and `Link` relations.

Because of those cache semantics, use response `Link` headers only when every emitted static or dynamic link is public and cache-stable for the request URI. Use `responseLinkHeader.filter` to remove links that are not safe for your cache boundary.

For example, this keeps only static manifest assets:

```tsx
handler.fetch(request, {
  responseLinkHeader: {
    filter: ({ phase }) => phase === 'static',
  },
});
```

## How CDN Asset Rewrites Affect Hints

Static Early Hints are collected from the final Start manifest resolved for the request. This means they follow the result of [`transformAssets`](./cdn-asset-urls):

- CDN URL rewrites are reflected in Early Hints.
- `crossOrigin` returned from `transformAssets` is reflected in Early Hints.
- JavaScript hints follow the client output format: `modulepreload` for module output, or `preload; as=script` for IIFE output.
- Per-request transforms with `cache: false` are reflected in Early Hints for that request.
- Inlined CSS assets are skipped when Start's [CSS inlining](./css-styling#inline-route-css-in-production) build option inlines them into the HTML.

## Event Shape

The callback receives an `EarlyHintsEvent`:

```ts
type EarlyHintsEvent = {
  phase: 'static' | 'dynamic';
  hints: ReadonlyArray<EarlyHint>;
  links: Array<string>;
  allHints: ReadonlyArray<EarlyHint>;
  allLinks: Array<string>;
};
```

`hints` is the structured form for the current phase. `links` is the serialized HTTP `Link` header form for the current phase. Both are deduped across phases, contain only new values, and are index-aligned.

`allHints` and `allLinks` contain all deduped values collected so far for the request. They are also index-aligned, and are useful when you want to write one combined `103` response during the `dynamic` phase.

The `responseLinkHeader.filter` callback receives entries with this shape:

```ts
type ResponseLinkHeaderEntry = {
  phase: 'static' | 'dynamic';
  hint: EarlyHint;
  link: string;
};
```

## Supported Links

Start emits Early Hints for link relations that map cleanly to HTTP `Link` headers:

- `preload`
- `modulepreload`
- `preconnect`
- `dns-prefetch`

Start serializes these attributes when present:

- `href`
- `rel`
- `as`
- `crossOrigin`
- `type`
- `integrity`
- `referrerPolicy`
- `fetchPriority`

Other head tags, inline styles, route scripts, and metadata are not converted into Early Hints.

HTML Early Hints processing does not apply `media`, `imageSrcSet`, or `imageSizes` until the final document exists, so Start does not serialize those attributes into `103` links.

## Runtime Example: Node

If your runtime exposes Node's `ServerResponse`, call `writeEarlyHints` with `links`. This example sends the earliest `static` hints:

```tsx
// src/server.ts
import handler, { createServerEntry } from '@tanstack/react-start/server-entry';
import type { ServerResponse } from 'node:http';

export default createServerEntry({
  fetch(request) {
    return handler.fetch(request, {
      onEarlyHints: ({ phase, links }) => {
        if (phase !== 'static' || !links.length) return;

        const response = getNodeResponseSomehow(request) as
          | ServerResponse
          | undefined;

        response?.writeEarlyHints({ link: links });
      },
    });
  },
});
```

Replace `getNodeResponseSomehow` with the API your adapter exposes.

## Runtime Example: srvx / Nitro on Node

Nitro uses [srvx](https://srvx.h3.dev/) under the hood for Node deployments. srvx exposes the native Node response on the request runtime context. This example waits for `dynamic` to send one redirect-safe response with both static and dynamic links:

```tsx
// src/server.ts
import handler from '@tanstack/react-start/server-entry';
import type { ServerRequest } from 'srvx';

export default {
  fetch(request: Request) {
    const serverRequest = request as ServerRequest;

    return handler.fetch(request, {
      onEarlyHints: ({ phase, allLinks }) => {
        if (phase !== 'dynamic') return;

        const response = serverRequest.runtime?.node?.res;

        if (response?.writeEarlyHints && allLinks.length) {
          response.writeEarlyHints({ link: allLinks });
        }
      },
    });
  },
};
```

## Limitations

- Early Hints are skipped in the Start dev server.
- Start only mutates the response `Link` header when `responseLinkHeader` is enabled.
- Browsers generally process only the first `103` response for a navigation.
- Static hints can be sent before `beforeLoad` redirects are known.
- The runtime or proxy in front of your app must support HTTP `103` responses.

---

id: cdn-asset-urls
title: CDN Asset URLs

---

# CDN Asset URLs

> **Experimental:** `transformAssets` is experimental and subject to change.

Use this guide when you need TanStack Start to rewrite manifest-managed asset URLs at runtime. The most common use case is serving JavaScript and CSS from a CDN whose origin is known only when the server starts, or varies per request.

This guide is about asset URL rewriting. For choosing CSS import patterns and configuring CSS inlining, see the [CSS Styling guide](./css-styling).

## What `transformAssets` Rewrites

The `transformAssets` option on `createStartHandler` rewrites URLs that Start manages in its SSR manifest:

- JavaScript preload links (`<link rel="modulepreload">` for module output, or `<link rel="preload" as="script">` for IIFE output)
- `<link rel="stylesheet">` tags for manifest-managed CSS
- The client entry script URL
- `url(...)` and `@import` URLs inside [inlined CSS](./css-styling#inline-route-css-in-production) when CSS URL templates are enabled

It does not rewrite every URL in your app. In particular, it does not rewrite arbitrary route `head().links` entries, including CSS imported with `?url` and returned from route `head()` functions. See [What This Does Not Rewrite](#what-this-does-not-rewrite) for the main exclusions.

## Use a Static CDN Prefix

Pass a string when every Start-managed asset should receive the same URL prefix.

```tsx
// src/server.ts
import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server';
import { createServerEntry } from '@tanstack/react-start/server-entry';

const handler = createStartHandler({
  handler: defaultStreamHandler,
  transformAssets: process.env.CDN_ORIGIN || '',
});

export default createServerEntry({ fetch: handler });
```

If `CDN_ORIGIN` is `https://cdn.example.com` and an asset URL is `/assets/index-abc123.js`, Start renders `https://cdn.example.com/assets/index-abc123.js`.

When the string is empty or not set, URLs are left unchanged.

## Add Cross-Origin Attributes

Use the object shorthand when you also need to set `crossOrigin` on manifest-managed `<link>` tags.

```tsx
// src/server.ts
import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server';
import { createServerEntry } from '@tanstack/react-start/server-entry';

const handler = createStartHandler({
  handler: defaultStreamHandler,
  transformAssets: {
    prefix: process.env.CDN_ORIGIN || '',
    crossOrigin: 'anonymous',
  },
});

export default createServerEntry({ fetch: handler });
```

`crossOrigin` accepts either one value for all supported link kinds, or a per-kind record that matches the `HeadContent assetCrossOrigin` shape.

```tsx
transformAssets: {
  prefix: 'https://cdn.example.com',
  crossOrigin: {
    script: 'anonymous',
    stylesheet: 'use-credentials',
  },
}
```

Kinds not listed in the per-kind record receive no `crossOrigin` attribute. The string shorthand and object shorthand are cached by default.

You can also set cross-origin behavior from your app shell with `HeadContent`:

```tsx
<HeadContent assetCrossOrigin='anonymous' />
```

or:

```tsx
<HeadContent
  assetCrossOrigin={{
    script: 'anonymous',
    stylesheet: 'use-credentials',
  }}
/>
```

If both `transformAssets` and `assetCrossOrigin` set a cross-origin value, `assetCrossOrigin` overrides the value from `transformAssets`. `assetCrossOrigin` only applies to manifest-managed script and stylesheet links, not arbitrary links returned from route `head()` functions.

## Use a Callback for Per-Asset Logic

Pass a callback when the output depends on the asset kind or URL. The callback returns a string, `{ href, crossOrigin? }`, or a `Promise` of either.

```tsx
// src/server.ts
import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server';
import { createServerEntry } from '@tanstack/react-start/server-entry';

const handler = createStartHandler({
  handler: defaultStreamHandler,
  transformAssets: (asset) => {
    const href = `https://cdn.example.com${asset.url}`;

    if (asset.kind === 'script') {
      return {
        href,
        crossOrigin: 'anonymous',
      };
    }

    return { href };
  },
});

export default createServerEntry({ fetch: handler });
```

The `kind` field tells you which asset URL is being transformed.

| `kind`         | Description                                    |
| -------------- | ---------------------------------------------- |
| `'script'`     | JavaScript preload or client entry script URL  |
| `'stylesheet'` | Manifest-managed CSS stylesheet URL            |
| `'css-url'`    | `url(...)` or `@import` URL inside inlined CSS |

For `kind === 'css-url'`, the context also includes `stylesheetHref`, which is the manifest stylesheet href whose CSS content is being inlined.

`crossOrigin` applies to manifest-managed script and stylesheet tags. For CSS-internal URLs, returning `{ href }` is equivalent to returning a string.

By default, callback results are cached after the first request in production. Use the object form with `cache: false` only when the transform depends on per-request data.

## Handle Per-Request CDN Selection

Use the object form with `cache: false` when the CDN origin depends on the current request, such as a request header, tenant, or region.

```tsx
// src/server.ts
import {
  createStartHandler,
  defaultStreamHandler,
  getRequest,
} from '@tanstack/react-start/server';
import { createServerEntry } from '@tanstack/react-start/server-entry';

const handler = createStartHandler({
  handler: defaultStreamHandler,
  transformAssets: {
    transform: ({ kind, url }) => {
      const region = getRequest().headers.get('x-region') || 'us';
      const cdnBase =
        region === 'eu'
          ? 'https://cdn-eu.example.com'
          : 'https://cdn-us.example.com';

      if (kind === 'script') {
        return {
          href: `${cdnBase}${url}`,
          crossOrigin: 'anonymous',
        };
      }

      return { href: `${cdnBase}${url}` };
    },
    cache: false,
  },
});

export default createServerEntry({ fetch: handler });
```

The object form accepts these properties:

| Property          | Type                                                                                                                            | Description                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `transform`       | `string \| (asset) => string \| { href, crossOrigin? } \| Promise<...>`                                                         | A string prefix or callback, same as the shorthand forms above.                                                               |
| `createTransform` | `(ctx: { warmup: true } \| { warmup: false; request: Request }) => (asset) => string \| { href, crossOrigin? } \| Promise<...>` | Async factory that runs once per manifest computation and returns a per-asset transform. Mutually exclusive with `transform`. |
| `cache`           | `boolean`                                                                                                                       | Whether to cache the transformed manifest. Defaults to `true`.                                                                |
| `warmup`          | `boolean`                                                                                                                       | When `true`, warms up the cached manifest on server startup in production. Defaults to `false`.                               |

Use `createTransform` when you need to do async work once per manifest computation, then transform many URLs with the result.

```ts
transformAssets: {
  cache: false,
  async createTransform(ctx) {
    if (ctx.warmup) {
      return ({ url }) => ({ href: url })
    }

    const region = ctx.request.headers.get('x-region') || 'us'
    const cdnBase = await fetchCdnBaseForRegion(region)

    return (asset) => {
      if (asset.kind === 'script') {
        return {
          href: `${cdnBase}${asset.url}`,
          crossOrigin: 'anonymous',
        }
      }

      return { href: `${cdnBase}${asset.url}` }
    }
  },
}
```

For a static CDN prefix, prefer the string or object shorthand. They are simpler and use the default cached manifest.

## Transform URLs Inside Inlined CSS

When Start's [CSS inlining](./css-styling#inline-route-css-in-production) is enabled, Start can also run `transformAssets` for URLs inside the inlined CSS content. This covers relative and root-relative `url(...)` and `@import` values, such as fonts and background images.

Because Start does not parse CSS at runtime, this requires opting into build-time CSS URL templates:

```ts
tanstackStart({
  server: {
    build: {
      inlineCss: {
        enabled: true,
        transformAssets: true,
      },
    },
  },
});
```

Passing `inlineCss: true` still inlines route CSS, but it does not emit the template metadata needed for runtime CSS URL transforms.

Relative CSS URLs are resolved against the emitted stylesheet href before your transform runs.

```css
/* emitted stylesheet href: /assets/dashboard.css */
.card {
  background-image: url('./dot.svg');
}
```

Your callback receives `/assets/dot.svg` with `kind: 'css-url'`. For example, you can serve JavaScript and CSS files from one CDN origin, and font or image URLs referenced inside inlined CSS from another origin.

```tsx
const handler = createStartHandler({
  handler: defaultStreamHandler,
  transformAssets: (asset) => {
    if (asset.kind === 'css-url') {
      return `https://static-assets.example.com${asset.url}`;
    }

    return `https://cdn.example.com${asset.url}`;
  },
});
```

When `asset.kind === 'css-url'`, the URL came from inside an inlined CSS file, such as a `url(...)` or `@import` reference. The callback context also includes `stylesheetHref`, which identifies the generated stylesheet that contained that URL. Use it when the transform needs to vary based on the source stylesheet.

```tsx
transformAssets: (asset) => {
  if (asset.kind === 'css-url') {
    const cdnBase = asset.stylesheetHref.includes('/admin-')
      ? 'https://admin-cdn.example.com'
      : 'https://cdn.example.com';

    return `${cdnBase}${asset.url}`;
  }

  return `https://cdn.example.com${asset.url}`;
};
```

Absolute URLs, protocol-relative URLs, data URLs, and hash references inside CSS are left unchanged and are not passed to `transformAssets`. If CSS URL templates were not enabled for the build, URLs inside inlined CSS are left unchanged at runtime.

## Choose When URL Rewrites Are Cached

In most apps, the CDN URL is the same for every request. Keep the default caching behavior for that case. Start computes the transformed manifest once in production, then reuses it for later requests.

Only turn caching off when the result can change per request, such as choosing a CDN by region, tenant, header, or cookie.

| Form                                 | Default cache | Behavior                                                    |
| ------------------------------------ | ------------- | ----------------------------------------------------------- |
| String prefix                        | `true`        | Computed once, cached in production.                        |
| Object shorthand                     | `true`        | Computed once, cached in production.                        |
| Callback                             | `true`        | Runs once on first request, cached in production.           |
| Object with `cache: true` or omitted | `true`        | Same as above.                                              |
| Object with `cache: false`           | `false`       | Deep-clones the base manifest and transforms every request. |

Use `cache: false` only when the transform depends on per-request data. For static CDN prefixes, the default `cache: true` is faster and simpler.

If you want to avoid doing the first cached rewrite during the first user request, set `warmup: true`. Start will compute the transformed manifest in the background when the server starts.

```ts
transformAssets: {
  transform: process.env.CDN_ORIGIN || '',
  cache: true,
  warmup: true,
}
```

Warmup has no effect in development mode or when `cache: false`.

> **Note:** In development mode (`TSS_DEV_SERVER`), caching is always skipped regardless of the `cache` setting, so you always get fresh manifests.

## Keep Client Navigation Chunks on the CDN

`transformAssets` rewrites the URLs in the SSR HTML: script preload hints, stylesheet links, and the client entry script. This means the browser's initial page load can fetch those assets from the CDN.

When users navigate client-side, TanStack Router lazy-loads route chunks using `import()` calls with paths baked in by the bundler. Configure your bundler so those async chunk URLs resolve relative to the client entry script that `transformAssets` rewrites to the CDN.

<!-- ::start:tabs variant="bundler" -->

# Vite

With Vite's default `base: '/'`, lazy route chunk paths are absolute, such as `/assets/about-abc123.js`, and resolve against the app server origin instead of the CDN.

For Vite builds, set `base: ''` so Vite generates relative import paths for client-side chunks.

```ts title="vite.config.ts"
import { defineConfig } from 'vite';

export default defineConfig({
  base: '',
  // ... plugins, etc.
});
```

With `base: ''`, the client entry script can be loaded from the CDN by `transformAssets`, and relative `import()` calls resolve against that same CDN origin. This keeps lazy-loaded route chunks on the CDN during client-side navigation.

Using an empty string rather than `'./'` is important. Both produce relative client-side imports, but `base: ''` preserves the root-relative paths in the SSR manifest so `transformAssets` can prepend the CDN origin correctly.

| `base` setting  | SSR assets on initial load    | Client-side navigation chunks |
| --------------- | ----------------------------- | ----------------------------- |
| `'/'` (default) | CDN through `transformAssets` | App server                    |
| `''`            | CDN through `transformAssets` | CDN, relative to entry module |

Use `base: ''` whenever you use `transformAssets` with Vite and want initial-load assets and client-navigation chunks served from the same CDN.

# Rsbuild

For Rsbuild builds, set `output.assetPrefix` to `'auto'` so Rspack derives async chunk URLs from the loaded client entry script.

```ts title="rsbuild.config.ts"
import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  output: {
    assetPrefix: 'auto',
  },
  // ... plugins, etc.
});
```

With `assetPrefix: 'auto'`, the client entry script can be loaded from the CDN by `transformAssets`, and async route chunks resolve relative to that entry script during client-side navigation.

<!-- ::end:tabs -->

## What This Does Not Rewrite

`transformAssets` rewrites Start manifest-managed assets and, when CSS URL templates are enabled, URLs inside CSS that Start inlines into the HTML.

It does not rewrite arbitrary links returned from route `head()` functions:

```tsx
import { createRootRoute } from '@tanstack/react-router';
import appCss from '../styles/app.css?url';

export const Route = createRootRoute({
  head: () => ({
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
});
```

If this stylesheet must use a CDN URL, use a bundler-level option or build-time configuration for that URL. If you want Start to manage the generated stylesheet URL, import the CSS as a side effect or CSS module instead. See [Choose a CSS Pattern](./css-styling#choose-a-css-pattern).

`transformAssets` also does not rewrite asset URLs imported directly in your components:

```tsx
// This import resolves to a URL at build time by your bundler.
import logo from './logo.svg';

function Header() {
  return <img src={logo} />; // This URL is not affected by transformAssets.
}
```

For these asset imports, use the URL controls provided by your bundler.

<!-- ::start:tabs variant="bundler" -->

# Vite

For Vite builds, use Vite's `experimental.renderBuiltUrl` in your `vite.config.ts`.

```ts title="vite.config.ts"
import { defineConfig } from 'vite';

export default defineConfig({
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        return { relative: true };
      }

      return `https://cdn.example.com/${filename}`;
    },
  },
});
```

# Rsbuild

For Rsbuild builds where the CDN origin is known at build time, use `output.assetPrefix` in your `rsbuild.config.ts`.

```ts title="rsbuild.config.ts"
import { defineConfig } from '@rsbuild/core';

export default defineConfig({
  output: {
    assetPrefix: 'https://cdn.example.com/',
  },
});
```

<!-- ::end:tabs -->
