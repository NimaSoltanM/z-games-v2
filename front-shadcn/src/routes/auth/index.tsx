import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router"
import { useRef, useState, useEffect, type FormEvent } from "react"
import { Phone, KeyRound, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { requestOtp, verifyOtp, registerUser, getMeFn } from "@/features/auth"

export const Route = createFileRoute("/auth/")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  beforeLoad: async () => {
    const me = await getMeFn()
    if (me) throw redirect({ to: "/games", search: { page: 1, platform: "", zarfiat: "", search: "", sort: "-created_at" } })
  },
  component: LoginPage,
})

type Step = "phone" | "otp" | "register"

function LoginPage() {
  const navigate = useNavigate()
  const { redirect: redirectTo } = Route.useSearch()

  function goAfterAuth() {
    if (redirectTo) {
      navigate({ to: redirectTo as any })
    } else {
      navigate({ to: "/games", search: { page: 1, platform: "", zarfiat: "", search: "", sort: "-created_at" } })
    }
  }

  const [step, setStep] = useState<Step>("phone")
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", ""])
  const [devCode, setDevCode] = useState<string | null>(null)
  const [registrationToken, setRegistrationToken] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [countdown, setCountdown] = useState(0)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  // Auto-fill OTP in dev mode
  useEffect(() => {
    if (step === "otp" && devCode) {
      const digits = devCode.replace(/\D/g, "").slice(0, 5)
      setOtp(Array.from({ length: 5 }, (_, i) => digits[i] ?? ""))
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
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
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
      setOtp(["", "", "", "", ""])
      setCountdown(60)
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
    } catch (err: any) {
      setError(err.message ?? "خطایی رخ داد")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault()
    const code = otp.join("")
    if (code.length !== 5) {
      setError("لطفاً کد ۵ رقمی را کامل وارد کنید")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await verifyOtp(phone, code)
      if (res.status === "existing") {
        goAfterAuth()
      } else {
        setRegistrationToken(res.registration_token)
        goToStep("register")
      }
    } catch (err: any) {
      setError(err.message ?? "خطایی رخ داد")
      setOtp(["", "", "", "", ""])
      setTimeout(() => otpRefs.current[0]?.focus(), 50)
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
      await registerUser(firstName.trim(), lastName.trim(), registrationToken)
      goAfterAuth()
    } catch (err: any) {
      setError(err.message ?? "خطایی رخ داد")
    } finally {
      setLoading(false)
    }
  }

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)
    if (digit && index < 4) otpRefs.current[index + 1]?.focus()
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 5)
    if (!text) return
    const next = Array.from({ length: 5 }, (_, i) => text[i] ?? "")
    setOtp(next)
    const firstEmpty = next.findIndex((v) => !v)
    otpRefs.current[firstEmpty === -1 ? 4 : firstEmpty]?.focus()
  }

  const stepIndex = step === "phone" ? 0 : step === "otp" ? 1 : 2

  return (
    <div className="relative min-h-[calc(100vh-57px)] bg-background bg-grid-lines flex items-center justify-center p-4">
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
        <div className="rounded-2xl border border-border/60 bg-card/75 backdrop-blur-sm p-8 shadow-xl shadow-black/10">
          {/* Phone step */}
          {step === "phone" && (
            <form onSubmit={handleRequestOtp} className="space-y-6">
              <div className="space-y-1.5 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Phone className="size-6" />
                </div>
                <h1 className="text-xl font-bold">ورود به Z-Games</h1>
                <p className="text-sm text-muted-foreground">شماره موبایلت رو وارد کن</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">شماره موبایل</Label>
                <Input
                  id="phone"
                  type="tel"
                  dir="ltr"
                  placeholder="09123456789"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setError("") }}
                  className="h-11 text-center text-base tracking-widest"
                  maxLength={11}
                  autoComplete="tel"
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <Button type="submit" className="w-full h-11" disabled={loading}>
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
                  <span dir="ltr" className="font-mono font-medium text-foreground">{phone}</span>{" "}
                  را وارد کن
                </p>
              </div>

              {/* OTP boxes */}
              <div dir="ltr" className="flex justify-center gap-2.5" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className={`h-14 w-12 rounded-xl border text-center text-2xl font-bold tabular-nums outline-none transition-all bg-transparent
                      ${digit
                        ? "border-primary/60 bg-primary/5 text-foreground"
                        : "border-input text-foreground"
                      }
                      focus:border-primary focus:ring-2 focus:ring-primary/30
                      disabled:opacity-50`}
                    disabled={loading}
                  />
                ))}
              </div>

              {devCode && (
                <p className="text-center text-xs text-muted-foreground/60">
                  کد توسعه: <span dir="ltr" className="font-mono">{devCode}</span>
                </p>
              )}

              {error && <p className="text-sm text-destructive text-center">{error}</p>}

              <Button type="submit" className="w-full h-11" disabled={loading || otp.join("").length !== 5}>
                {loading ? "در حال بررسی..." : "تأیید"}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => goToStep("phone")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  تغییر شماره
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || loading}
                  className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
                <p className="text-sm text-muted-foreground">اولین باره، اسمت رو وارد کن</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">نام</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); setError("") }}
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
                    onChange={(e) => { setLastName(e.target.value); setError("") }}
                    placeholder="محمدی"
                    className="h-11"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? "در حال ثبت‌نام..." : "ثبت‌نام و ورود"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
