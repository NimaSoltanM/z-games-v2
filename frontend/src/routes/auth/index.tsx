import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router"
import { useState, useEffect } from "react"
import type { FormEvent } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { REGEXP_ONLY_DIGITS } from "input-otp"
import { Phone, KeyRound, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Label } from "@/components/ui/label"
import { requestOtp, verifyOtp, registerUser, getMeFn } from "@/features/auth"
import {
  cartStore,
  clearCart,
  mergeServerCart,
  SERVER_CART_KEY,
} from "@/features/cart"
import { getReferral } from "@/features/referral"
import { noIndexHead } from "@/features/seo"

export const Route = createFileRoute("/auth/")({
  head: () => noIndexHead("ورود به حساب کاربری | زد گیمز"),
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: async () => {
    const me = await getMeFn()
    if (me)
      throw redirect({
        to: "/games",
        search: {
          page: 1,
          platform: "",
          zarfiat: "",
          search: "",
          sort: "-created_at",
        },
      })
  },
  component: LoginPage,
})

type Step = "phone" | "otp" | "register"

function LoginPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { redirect: redirectTo } = Route.useSearch()

  async function finishAuth() {
    // Merge the anonymous cart into the now-authenticated server cart, then
    // clear the local cart so items aren't double-counted. A merge failure must
    // not block login — the user is authenticated regardless.
    const anon = cartStore.state.items
    if (anon.length > 0) {
      try {
        await mergeServerCart(
          anon.map((i) => ({
            game_id: i.gameId,
            platform: i.platform,
            zarfiat: i.zarfiat,
            quantity: i.quantity,
          }))
        )
      } catch {
        // ignore — keep logging the user in
      }
      clearCart()
    }

    // Refresh auth + cart so the navbar and cart page reflect the logged-in state.
    await queryClient.invalidateQueries({ queryKey: ["me"] })
    queryClient.invalidateQueries({ queryKey: SERVER_CART_KEY })

    if (redirectTo) {
      navigate({ to: redirectTo as any })
    } else {
      navigate({
        to: "/games",
        search: {
          page: 1,
          platform: "",
          zarfiat: "",
          search: "",
          sort: "-created_at",
        },
      })
    }
  }

  const [step, setStep] = useState<Step>("phone")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [devCode, setDevCode] = useState<string | null>(null)
  const [registrationToken, setRegistrationToken] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [countdown, setCountdown] = useState(0)
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // Auto-fill OTP in dev mode
  useEffect(() => {
    if (step === "otp" && devCode) {
      const digits = devCode.replace(/\D/g, "").slice(0, 5)
      setOtp(digits)
    }
  }, [step, devCode])

  function goToStep(next: Step) {
    setError("")
    setStep(next)
  }

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault()
    if (!phone.match(/^09\d{9}$/)) {
      setError("شماره موبایل را به فرمت ۰۹XXXXXXXXX وارد کنید")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await requestOtp(phone)
      setDevCode(res.dev_code ?? null)
      goToStep("otp")
      setCountdown(60)
    } catch (err: any) {
      setError(err.message ?? "خطایی رخ داد")
    } finally {
      setLoading(false)
    }
  }

  async function handleResendOtp() {
    if (countdown > 0) return
    setLoading(true)
    setError("")
    try {
      const res = await requestOtp(phone)
      setDevCode(res.dev_code ?? null)
      setOtp("")
      setCountdown(60)
    } catch (err: any) {
      setError(err.message ?? "خطایی رخ داد")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault()
    const code = otp
    if (code.length !== 5) {
      setError("لطفاً کد ۵ رقمی را کامل وارد کنید")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await verifyOtp(phone, code)
      if (res.status === "existing") {
        await finishAuth()
      } else {
        setRegistrationToken(res.registration_token)
        goToStep("register")
      }
    } catch (err: any) {
      setError(err.message ?? "خطایی رخ داد")
      setOtp("")
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      setError("نام و نام خانوادگی الزامی است")
      return
    }
    setLoading(true)
    setError("")
    try {
      await registerUser(
        firstName.trim(),
        lastName.trim(),
        registrationToken,
        getReferral()
      )
      await finishAuth()
    } catch (err: any) {
      setError(err.message ?? "خطایی رخ داد")
    } finally {
      setLoading(false)
    }
  }

  const stepIndex = step === "phone" ? 0 : step === "otp" ? 1 : 2

  return (
    <div className="relative flex min-h-[calc(100vh-57px)] items-center justify-center bg-background bg-grid-lines p-4">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-violet-500/8 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Step dots */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === stepIndex
                  ? "w-6 bg-primary"
                  : i < stepIndex
                    ? "w-2 bg-primary/50"
                    : "w-2 bg-border"
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border/60 bg-card/75 p-8 shadow-xl shadow-black/10 backdrop-blur-sm">
          {/* Phone step */}
          {step === "phone" && (
            <form onSubmit={handleRequestOtp} className="space-y-6">
              <div className="space-y-1.5 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Phone className="size-6" />
                </div>
                <h1 className="text-xl font-bold">ورود به Z-Games</h1>
                <p className="text-sm text-muted-foreground">
                  شماره موبایلت رو وارد کن
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">شماره موبایل</Label>
                <Input
                  id="phone"
                  type="tel"
                  dir="ltr"
                  placeholder="09123456789"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value)
                    setError("")
                  }}
                  className="h-11 text-center text-base tracking-widest"
                  maxLength={11}
                  autoComplete="tel"
                  autoFocus
                />
              </div>
              {error && (
                <p className="text-center text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? "در حال ارسال..." : "ارسال کد تأیید"}
              </Button>
            </form>
          )}

          {/* OTP step */}
          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="space-y-1.5 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <KeyRound className="size-6" />
                </div>
                <h1 className="text-xl font-bold">کد تأیید</h1>
                <p className="text-sm text-muted-foreground">
                  کد ارسال شده به{" "}
                  <span
                    dir="ltr"
                    className="font-mono font-medium text-foreground"
                  >
                    {phone}
                  </span>{" "}
                  را وارد کن
                </p>
              </div>

              {/* OTP boxes */}
              <InputOTP
                dir="ltr"
                name="otp"
                aria-label="کد تأیید پنج رقمی"
                aria-invalid={Boolean(error)}
                autoComplete="one-time-code"
                autoFocus
                inputMode="numeric"
                pattern={REGEXP_ONLY_DIGITS}
                maxLength={5}
                value={otp}
                onChange={setOtp}
                textAlign="center"
                containerClassName="justify-center [direction:ltr]"
                disabled={loading}
              >
                <InputOTPGroup dir="ltr" className="gap-2.5 rounded-none">
                  {Array.from({ length: 5 }, (_, i) => (
                    <InputOTPSlot
                      key={i}
                      index={i}
                      className="h-14 w-12 rounded-xl border border-input bg-transparent text-2xl font-bold text-foreground tabular-nums first:rounded-xl first:border last:rounded-xl data-[active=true]:border-primary data-[active=true]:ring-2 data-[active=true]:ring-primary/30 dark:bg-transparent"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>

              {devCode && (
                <p className="text-center text-xs text-muted-foreground/60">
                  کد توسعه:{" "}
                  <span dir="ltr" className="font-mono">
                    {devCode}
                  </span>
                </p>
              )}

              {error && (
                <p className="text-center text-sm text-destructive">{error}</p>
              )}

              <Button
                type="submit"
                className="h-11 w-full"
                disabled={loading || otp.length !== 5}
              >
                {loading ? "در حال بررسی..." : "تأیید"}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => goToStep("phone")}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  تغییر شماره
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || loading}
                  className="text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {countdown > 0 ? `ارسال مجدد (${countdown}s)` : "ارسال مجدد"}
                </button>
              </div>
            </form>
          )}

          {/* Register step */}
          {step === "register" && (
            <form onSubmit={handleRegister} className="space-y-6">
              <div className="space-y-1.5 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <User className="size-6" />
                </div>
                <h1 className="text-xl font-bold">تکمیل ثبت‌نام</h1>
                <p className="text-sm text-muted-foreground">
                  اولین باره، اسمت رو وارد کن
                </p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">نام</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value)
                      setError("")
                    }}
                    placeholder="علی"
                    className="h-11"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">نام خانوادگی</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value)
                      setError("")
                    }}
                    placeholder="محمدی"
                    className="h-11"
                  />
                </div>
              </div>
              {error && (
                <p className="text-center text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="h-11 w-full" disabled={loading}>
                {loading ? "در حال ثبت‌نام..." : "ثبت‌نام و ورود"}
              </Button>
            </form>
          )}
        </div>
        <p className="mt-4 text-center text-xs leading-6 text-muted-foreground">
          با ادامه،{" "}
          <Link
            to="/terms"
            className="font-medium text-foreground underline underline-offset-4 transition-colors hover:text-primary"
          >
            قوانین و مقررات زد گیمز
          </Link>{" "}
          را می‌پذیرید.
        </p>
      </div>
    </div>
  )
}
