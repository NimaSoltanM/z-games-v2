import {
  createFileRoute,
  ErrorComponent,
  Link,
  useNavigate,
} from "@tanstack/react-router"
import type { ErrorComponentProps } from "@tanstack/react-router"
import {
  useSuspenseQuery,
  useQueries,
  useQueryErrorResetBoundary,
} from "@tanstack/react-query"
import { Suspense, useEffect, useState } from "react"
import { ErrorBoundary } from "react-error-boundary"
import {
  Minus,
  Plus,
  Trash2,
  ShoppingCart,
  AlertTriangle,
  Loader2,
} from "lucide-react"

import type { ConsolePlatform, Zarfiat } from "@/features/games"
import { checkoutOrder } from "@/features/orders/api"
import { getReferral, setReferral } from "@/features/referral"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  gameQueryOptions,
  calcPrice,
  discountedPrice,
  formatToman,
  consoleLabel,
  capacityLabel,
  platformBadgeClass,
  platformAccentClass,
  gameCoverSrc,
  PreOrderBadge,
} from "@/features/games"
import { useCart, cartTotal } from "@/features/cart"
import type { CartItem, GamePricing } from "@/features/cart"

function CartError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />
}

export const Route = createFileRoute("/cart/")({
  component: CartPage,
  errorComponent: CartError,
})

type SetQty = (
  gameId: string,
  platform: ConsolePlatform,
  zarfiat: Zarfiat,
  quantity: number
) => void
type Remove = (
  gameId: string,
  platform: ConsolePlatform,
  zarfiat: Zarfiat
) => void

function CartPage() {
  const { reset } = useQueryErrorResetBoundary()
  const { items, removeItem, setItemQty, clear, isLoading } = useCart()

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 h-8 w-40">
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="space-y-3">
          <CartItemSkeleton />
          <CartItemSkeleton />
          <CartItemSkeleton />
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[calc(100vh-57px)] flex-col items-center justify-center gap-5 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm">
          <ShoppingCart className="size-8 text-muted-foreground/40" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-semibold">سبد خرید خالی است</p>
          <p className="text-sm text-muted-foreground">
            بازی مورد نظرت رو انتخاب کن
          </p>
        </div>
        <Link
          to="/games"
          search={{
            page: 1,
            platform: "",
            zarfiat: "",
            search: "",
            sort: "-created_at",
          }}
        >
          <Button>مشاهده بازی‌ها</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-background bg-grid-lines">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">سبد خرید</h1>
          <button
            onClick={() => clear()}
            className="text-xs text-muted-foreground transition-colors hover:text-destructive"
          >
            حذف همه
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Items list — extra bottom padding on mobile so items aren't hidden behind sticky bar */}
          <div className="space-y-3 pb-24 lg:col-span-2 lg:pb-0">
            {items.map((item) => (
              <ErrorBoundary
                key={`${item.gameId}:${item.platform}:${item.zarfiat}`}
                onReset={reset}
                fallbackRender={({ resetErrorBoundary }) => (
                  <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                    <p className="text-sm text-destructive">
                      خطا در بارگذاری این بازی
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetErrorBoundary}
                      >
                        تلاش مجدد
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          removeItem(item.gameId, item.platform, item.zarfiat)
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              >
                <Suspense fallback={<CartItemSkeleton />}>
                  <CartItemRow
                    item={item}
                    onSetQty={setItemQty}
                    onRemove={removeItem}
                  />
                </Suspense>
              </ErrorBoundary>
            ))}
          </div>

          {/* Summary sidebar — desktop only */}
          <div className="hidden lg:col-span-1 lg:block">
            <CartSummary items={items} />
          </div>
        </div>

        {/* Sticky bottom bar — mobile only */}
        <CartMobileBar items={items} />
      </div>
    </div>
  )
}

function CartItemRow({
  item,
  onSetQty,
  onRemove,
}: {
  item: CartItem
  onSetQty: SetQty
  onRemove: Remove
}) {
  const { data } = useSuspenseQuery(gameQueryOptions(item.gameId))
  const { game, exchange_rate } = data

  const priceEntry = game.prices.find(
    (p) => p.platform === item.platform && p.zarfiat === item.zarfiat
  )
  // A pre-order in its closing window is active + priced but NOT purchasable, and
  // checkout would reject it — so flag it unavailable here, exactly like an
  // inactive game, instead of letting it look buyable and fail at the gateway.
  const isValid = game.active && !!priceEntry && game.purchasable
  const currentPrice = isValid
    ? calcPrice(game, item.platform, item.zarfiat, exchange_rate)
    : null

  const imgSrc = gameCoverSrc(game.cover_image, game.id)

  const accentClass = platformAccentClass(item.platform)

  return (
    <div
      className={`rounded-xl border border-r-2 border-border/60 bg-card/75 p-4 backdrop-blur-sm transition-colors ${
        isValid ? accentClass : "border-r-destructive/50 bg-destructive/5"
      }`}
    >
      {!isValid && (
        <div className="mb-3 flex items-center gap-2 text-xs text-destructive">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span>
            {!game.active
              ? "این بازی دیگر موجود نیست"
              : !priceEntry
                ? "این ظرفیت حذف شده است"
                : "پیش‌خرید این بازی بسته شده و به‌زودی منتشر می‌شود"}
          </span>
        </div>
      )}

      <div className="flex items-center gap-4">
        <img
          src={imgSrc}
          alt={game.name}
          className={`h-16 w-12 shrink-0 rounded-lg object-cover ${!isValid ? "opacity-40" : ""}`}
        />

        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="truncate text-sm font-medium">{game.name}</p>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={`border text-xs ${platformBadgeClass(item.platform)}`}
            >
              {consoleLabel(item.platform, exchange_rate)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {capacityLabel(item.zarfiat, exchange_rate)}
            </span>
            {isValid && game.phase === "pre_order" && <PreOrderBadge />}
          </div>
          {isValid && currentPrice !== null && (
            <div className="flex items-center gap-2">
              {(() => {
                const final =
                  discountedPrice(currentPrice, game) ?? currentPrice
                return final < currentPrice ? (
                  <>
                    <span className="text-xs text-muted-foreground tabular-nums line-through">
                      {formatToman(currentPrice)}
                    </span>
                    <span className="text-sm font-semibold text-primary tabular-nums">
                      {formatToman(final)}
                    </span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-primary tabular-nums">
                    {formatToman(currentPrice)}
                  </span>
                )
              })()}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {isValid && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() =>
                  onSetQty(
                    item.gameId,
                    item.platform,
                    item.zarfiat,
                    item.quantity - 1
                  )
                }
              >
                <Minus className="size-3" />
              </Button>
              <span className="w-6 text-center text-sm font-medium tabular-nums">
                {item.quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={item.quantity >= 10}
                onClick={() =>
                  onSetQty(
                    item.gameId,
                    item.platform,
                    item.zarfiat,
                    item.quantity + 1
                  )
                }
              >
                <Plus className="size-3" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(item.gameId, item.platform, item.zarfiat)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function useCartTotal(items: CartItem[]) {
  const results = useQueries({
    queries: items.map((item) => gameQueryOptions(item.gameId)),
  })

  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0)
  const allLoaded = results.every((r) => r.isSuccess)

  if (!allLoaded) {
    return { total: 0, allKnown: false, totalQuantity }
  }

  const pricingByGame = new Map<string, GamePricing>()
  items.forEach((item, i) => {
    const data = results[i].data
    pricingByGame.set(item.gameId, {
      game: data.game,
      exchange_rate: data.exchange_rate,
    })
  })

  return {
    total: cartTotal(items, pricingByGame),
    allKnown: true,
    totalQuantity,
  }
}

// Shared checkout action: gate on auth, then create the order and hand off to
// ZarinPal. Not logged in -> bounce to /auth and return to the cart afterward.
function useCheckout() {
  const { isLoggedIn } = useCart()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function checkout() {
    setError("")
    if (!isLoggedIn) {
      navigate({ to: "/auth", search: { redirect: "/cart" } })
      return
    }
    setPending(true)
    try {
      const { payment_url } = await checkoutOrder({
        referral_code: getReferral(),
      })
      window.location.href = payment_url
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در شروع پرداخت")
      setPending(false)
    }
  }

  return { checkout, pending, error }
}

function CartSummary({ items }: { items: CartItem[] }) {
  const { total, allKnown, totalQuantity } = useCartTotal(items)
  const { checkout, pending, error } = useCheckout()
  const [ref, setRef] = useState("")

  // Prefill from a stored ?ref link after hydration (avoids SSR mismatch).
  useEffect(() => {
    setRef(getReferral())
  }, [])

  return (
    <div className="space-y-5 rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm lg:sticky lg:top-24">
      <p className="text-sm font-semibold">خلاصه سفارش</p>
      <Separator />
      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>تعداد</span>
          <span>{totalQuantity} عدد</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>مجموع</span>
          <span className="text-primary">
            {allKnown ? formatToman(total) : "در حال محاسبه..."}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="referral" className="text-xs text-muted-foreground">
          کد معرف (اختیاری)
        </label>
        <input
          id="referral"
          value={ref}
          onChange={(e) => {
            setRef(e.target.value)
            setReferral(e.target.value)
          }}
          placeholder="کد معرف را وارد کنید"
          className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/50 focus:outline-none"
        />
      </div>

      <Button
        className="w-full gap-1.5"
        disabled={!allKnown || pending}
        onClick={checkout}
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            در حال انتقال به درگاه...
          </>
        ) : (
          "تکمیل خرید"
        )}
      </Button>
      {error && <p className="text-center text-xs text-destructive">{error}</p>}
      <Link
        to="/games"
        search={{
          page: 1,
          platform: "",
          zarfiat: "",
          search: "",
          sort: "-created_at",
        }}
        className="block text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        ادامه خرید ←
      </Link>
    </div>
  )
}

function CartMobileBar({ items }: { items: CartItem[] }) {
  const { total, allKnown, totalQuantity } = useCartTotal(items)
  const { checkout, pending, error } = useCheckout()

  return (
    <div className="fixed right-0 bottom-0 left-0 z-20 flex items-center gap-4 border-t border-border/60 bg-background/95 px-4 py-3 backdrop-blur-md lg:hidden">
      <div className="min-w-0 flex-1">
        {error ? (
          <p className="truncate text-xs text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">{totalQuantity} کالا</p>
        )}
        <p className="truncate text-sm font-bold text-primary">
          {allKnown ? formatToman(total) : "در حال محاسبه..."}
        </p>
      </div>
      <Button
        className="shrink-0 gap-1.5"
        disabled={!allKnown || pending}
        size="sm"
        onClick={checkout}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : "تکمیل خرید"}
      </Button>
    </div>
  )
}

function CartItemSkeleton() {
  return (
    <div className="rounded-xl border border-r-2 border-border/60 border-r-border p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-12 shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  )
}
