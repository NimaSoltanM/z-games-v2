import { useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  ShoppingCart,
  Menu,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ModeToggle } from "@/components/mode-toggle"
import { logout } from "@/features/auth"
import type { MeResponse } from "@/features/auth"
import { useCart, SERVER_CART_KEY } from "@/features/cart"
import { GAMES_DEFAULT_SEARCH } from "@/features/games"

const NAV_LINKS = [
  { to: "/", label: "خانه", exact: true },
  { to: "/games", label: "بازی‌ها", exact: false },
] as const

const ADMIN_HOME_SEARCH = { page: 1, status: "", search: "" } as const

function initialsOf(me: MeResponse) {
  const f = me.firstName?.trim()[0] ?? ""
  const l = me.lastName?.trim()[0] ?? ""
  const init = (f + l).trim()
  if (init) return init
  return me.phone ? me.phone.slice(-2) : "؟"
}

function fullNameOf(me: MeResponse) {
  const name = [me.firstName, me.lastName].filter(Boolean).join(" ").trim()
  return name || "حساب کاربری"
}

export function Navbar() {
  const { me, isLoggedIn, totalQuantity } = useCart()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isAdmin = me != null && me.role !== "user"

  async function handleLogout() {
    setMobileOpen(false)
    try {
      await logout()
    } catch {
      // even if the network call fails, clear local auth state below
    }
    await queryClient.invalidateQueries({ queryKey: ["me"] })
    queryClient.invalidateQueries({ queryKey: SERVER_CART_KEY })
    navigate({ to: "/games", search: GAMES_DEFAULT_SEARCH })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/50 bg-background/80 backdrop-blur-md after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-linear-to-r after:from-transparent after:via-primary/40 after:to-transparent">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Brand + desktop nav */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight"
          >
            <img
              src="/brand/logo-32.webp"
              srcSet="/brand/logo-32.webp 32w, /brand/logo-64.webp 64w"
              sizes="32px"
              alt="Z-Games"
              width={32}
              height={32}
              decoding="async"
              className="size-8 object-contain"
            />
            Z-Games
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                search={l.to === "/games" ? GAMES_DEFAULT_SEARCH : undefined}
                activeOptions={{ exact: l.exact }}
                className="relative px-2 py-2 text-sm text-muted-foreground transition-colors after:absolute after:inset-x-2 after:bottom-1 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform after:duration-200 hover:text-foreground [&.active]:text-foreground [&.active]:after:scale-x-100"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <CartButton count={totalQuantity} />
          <ModeToggle />

          {isAdmin && (
            <Button
              render={
                <Link
                  to="/admin/orders"
                  search={ADMIN_HOME_SEARCH}
                  aria-label="ورود به پنل مدیریت"
                />
              }
              nativeButton={false}
              variant="secondary"
              size="sm"
              className="hidden gap-1.5 md:inline-flex"
            >
              <ShieldCheck className="size-3.5" />
              پنل مدیریت
            </Button>
          )}

          {/* Auth — desktop */}
          <div className="hidden md:block">
            {me === undefined ? (
              <Skeleton className="size-7 rounded-full" />
            ) : isLoggedIn && me ? (
              <UserMenu me={me} onLogout={handleLogout} />
            ) : (
              <Button
                render={<Link to="/auth" search={{ redirect: undefined }} />}
                nativeButton={false}
                size="sm"
              >
                ورود
              </Button>
            )}
          </div>

          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="md:hidden"
                  aria-label="باز کردن منو"
                />
              }
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>منو</SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-1 px-4">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    search={
                      l.to === "/games" ? GAMES_DEFAULT_SEARCH : undefined
                    }
                    activeOptions={{ exact: l.exact }}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg border-r-2 border-transparent px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-accent [&.active]:border-primary [&.active]:bg-primary/8 [&.active]:font-semibold [&.active]:text-primary"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>

              <Separator className="my-2" />

              <div className="px-4">
                {me === undefined ? (
                  <Skeleton className="h-9 w-full rounded-lg" />
                ) : isLoggedIn && me ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                        {initialsOf(me)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {fullNameOf(me)}
                        </p>
                        {isAdmin && (
                          <p className="text-xs font-medium text-primary">
                            حساب مدیر
                          </p>
                        )}
                        {me.phone && (
                          <p
                            dir="ltr"
                            className="truncate text-xs text-muted-foreground"
                          >
                            {me.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <Button
                        render={
                          <Link
                            to="/admin/orders"
                            search={ADMIN_HOME_SEARCH}
                            onClick={() => setMobileOpen(false)}
                          />
                        }
                        nativeButton={false}
                        className="h-auto w-full justify-start gap-3 py-3 text-start whitespace-normal"
                      >
                        <ShieldCheck className="size-4" />
                        <span className="flex-1">
                          <span className="block font-semibold">
                            ورود به پنل مدیریت
                          </span>
                          <span className="mt-0.5 block text-xs font-normal opacity-70">
                            سفارش‌ها، بازی‌ها، بازگشت‌ها و قیمت‌گذاری
                          </span>
                        </span>
                        <ArrowLeft className="size-4" />
                      </Button>
                    )}
                    <Link
                      to="/dashboard"
                      search={{ page: 1, status: "" }}
                      onClick={() => setMobileOpen(false)}
                    >
                      <Button variant="outline" className="w-full gap-1.5">
                        <LayoutDashboard className="size-4" />
                        سفارش‌های من
                      </Button>
                    </Link>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={handleLogout}
                    >
                      <LogOut className="size-4" />
                      خروج از حساب
                    </Button>
                  </div>
                ) : (
                  <Link
                    to="/auth"
                    search={{ redirect: undefined }}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Button className="w-full">ورود / ثبت‌نام</Button>
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

function CartButton({ count }: { count: number }) {
  return (
    <Link
      to="/cart"
      aria-label="سبد خرید"
      className="relative inline-flex size-7 items-center justify-center rounded-[min(var(--radius-md),12px)] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&.active]:bg-muted [&.active]:text-foreground"
    >
      <ShoppingCart className="size-5" />
      {count > 0 && (
        <span className="absolute -top-1 -left-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  )
}

function UserMenu({ me, onLogout }: { me: MeResponse; onLogout: () => void }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        render={
          <button
            className="group flex items-center gap-2 rounded-full border border-border/60 bg-card/60 py-1 ps-1 pe-2.5 transition-colors hover:bg-accent aria-expanded:bg-accent"
            aria-label="حساب کاربری"
          />
        }
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
          {initialsOf(me)}
        </span>
        <span className="max-w-28 truncate text-sm">
          {me.firstName ?? "حساب من"}
        </span>
        <ChevronDown className="size-3.5 text-muted-foreground transition-transform group-aria-expanded:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <div className="flex flex-col px-1.5 py-1.5">
          <span className="truncate text-sm font-medium text-foreground">
            {fullNameOf(me)}
          </span>
          {me.phone && (
            <span dir="ltr" className="truncate text-xs text-muted-foreground">
              {me.phone}
            </span>
          )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={<Link to="/dashboard" search={{ page: 1, status: "" }} />}
        >
          <LayoutDashboard className="size-4" />
          سفارش‌های من
        </DropdownMenuItem>
        {me.role !== "user" && (
          <DropdownMenuItem
            render={<Link to="/admin/orders" search={ADMIN_HOME_SEARCH} />}
            className="gap-3 py-2.5"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-medium text-foreground">
                پنل مدیریت
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                سفارش‌ها، بازی‌ها و تنظیمات فروشگاه
              </span>
            </span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onLogout}>
          <LogOut className="size-4" />
          خروج از حساب
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
