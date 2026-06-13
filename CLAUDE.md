# z-games-v2

> **New to this project?** Read [`PROJECT.md`](./PROJECT.md) first — it explains the business model, zarfiat tiers, why delivery is manual, and V1 scope.

## THIS IS A PRODUCTION PROJECT

This is a real business the owner earns a living from — not a side project or a learning exercise. Every line of code ships to real paying customers.

**What this means:**
- Write production-quality code only. No TODOs, no shortcuts, no "we'll fix this later."
- Safe and correct over clever. If something can go wrong for a user, it must be handled.
- No bloat. Don't add abstractions, configs, or features that aren't asked for.
- When in doubt about a business decision (pricing, wording, flow), ask — don't guess.

## Stack

- **Backend (Go)**: Fiber v3 + pgx + sqlc (PostgreSQL)
- **Backend (JS, legacy)**: Bun + ElysiaJS + Drizzle ORM (PostgreSQL) — kept for reference, not actively developed
- **Frontend**: React 19 + TanStack Start + TanStack Router + TanStack Query + HeroUI + Tailwind CSS v4

---

## MANDATORY: Always read docs before coding

Before writing or editing ANY code that touches Fiber, TanStack (Router, Query, Start), HeroUI, or Drizzle — you MUST read the relevant local doc file first. No exceptions, even if you already know the API.

| Library         | Doc file                     |
| --------------- | ---------------------------- |
| Fiber v3        | `docs/fiber/llms-full.md`    |
| TanStack Router | `docs/tanstack/router.md`    |
| TanStack Query  | `docs/tanstack/query.md`     |
| TanStack Start  | `docs/tanstack/start.md`     |
| HeroUI          | `docs/heroui/llms-full.txt`  |
| Drizzle ORM     | `docs/drizzle/llms-full.txt` |

Do not rely on training knowledge for these libraries. Always verify the exact API, hook name, import path, and option shape from the doc file before using it.

---

## MANDATORY: Fiber middleware — check before coding

Fiber v3 has built-in middleware that may already solve what you're about to write manually. Before implementing any cross-cutting concern (auth, logging, CORS, rate limiting, compression, etc.), check this list first.

**Available middleware:**

```
adaptor       basicauth     cache         compress      cors
csrf          earlydata     encryptcookie envvar        etag
expvar        favicon       healthcheck   helmet        hostauthorization
idempotency   keyauth       limiter       logger        paginate
pprof         proxy         recover       redirect      requestid
responsetime  rewrite       session       skip          sse
static        timeout
```

Full docs for each middleware are NOT included in the local doc file. **If you want to use a middleware from this list, ask the user to provide its docs before writing any code that depends on it.**

---

## MANDATORY: Error language convention (backend)

The website is Persian and RTL. All backend errors follow a strict two-language rule:

**User-facing errors → Persian**
Any message returned to the client inside an HTTP response (e.g. `status(400, { message: "..." })`, `status(429, { message: "..." })`) must be in Persian.

**Developer-facing errors → English**
Anything thrown as an exception, written to logs, or used as an internal error code (e.g. `throw new Error(...)`, `throw new AuthError(...)`, `console.error(...)`) must be in English.

```go
// ✅ correct
return fmt.Errorf("OTP_INVALID: code mismatch") // English — developer/logs
return c.Status(400).JSON(fiber.Map{"message": "کد تأیید اشتباه است"}) // Persian — user sees this

// ❌ wrong
return fmt.Errorf("کد اشتباه است")
return c.Status(400).JSON(fiber.Map{"message": "OTP is invalid"})
```

Never mix the two. If you're writing a new error, ask: will a user read this in the UI, or will a developer read it in logs/code? Answer that, then pick the language.

---

## MANDATORY: Data fetching pattern

Every route that fetches data MUST follow the pattern in `docs/tanstack/must-use.txt` exactly. Do not deviate.

**The required pattern:**

```tsx
import { createFileRoute, ErrorComponent } from '@tanstack/react-router';
import type { ErrorComponentProps } from '@tanstack/react-router';
import {
  queryOptions,
  useQueryErrorResetBoundary,
  useSuspenseQuery, // always useSuspenseQuery, never useQuery
} from '@tanstack/react-query';
import { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

// 1. Define query config with queryOptions()
const myQueryOptions = () =>
  queryOptions({
    queryKey: ['key'],
    queryFn: async () => {
      /* fetch */
    },
  });

// 2. Error component for the route
function MyError({ error, reset }: ErrorComponentProps) {
  return <ErrorComponent error={error} />;
}

// 3. Route with loader that prefetches + errorComponent
export const Route = createFileRoute('/path')({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(myQueryOptions());
  },
  component: MyPage,
  errorComponent: MyError,
});

// 4. Page wraps with ErrorBoundary + Suspense
function MyPage() {
  const { reset } = useQueryErrorResetBoundary();
  return (
    <ErrorBoundary
      onReset={reset}
      fallbackRender={({ resetErrorBoundary }) => (
        <div>
          <p>Something went wrong</p>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      )}>
      <Suspense fallback={<p>Loading...</p>}>
        <MyDataComponent />
      </Suspense>
    </ErrorBoundary>
  );
}

// 5. Data component uses useSuspenseQuery
function MyDataComponent() {
  const { data } = useSuspenseQuery(myQueryOptions());
  return <div>{/* render data */}</div>;
}
```

**For paginated / infinite scroll data:** use `useSuspenseInfiniteQuery` instead of `useSuspenseQuery`, but keep the exact same route structure (loader prefetch, ErrorBoundary, Suspense, errorComponent). Never skip any part of the skeleton.

**Never:**

- Use `useQuery` instead of `useSuspenseQuery`
- Fetch inside `useEffect`
- Skip the route loader prefetch
- Skip the ErrorBoundary or Suspense wrapper
- Skip `errorComponent` on the route

<!-- HEROUI-REACT-AGENTS-MD-START -->

[HeroUI React v3 Docs Index]|root: ./.heroui-docs/react|STOP. What you remember about HeroUI React v3 is WRONG for this project. 
check stuff in .heroui-docs in frontend folder.

<!-- HEROUI-REACT-AGENTS-MD-END -->

the folders are feature/module based. check the files to do that exact patterns

---

## TODO / Future Work

- **View transitions on back navigation**: `router.history.back()` bypasses TanStack Router's `navigate()` so `viewTransition: true` doesn't apply. The nuclear option is `defaultViewTransition: true` on the router (in `front-shadcn/src/router.tsx`) which wraps every navigation globally — but that adds overhead to filter/sort/pagination changes. Pending a cleaner per-call solution.
