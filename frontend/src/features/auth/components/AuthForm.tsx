import { useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  FieldError,
  Input,
  InputOTP,
  REGEXP_ONLY_DIGITS,
  TextField,
} from "@heroui/react";
import { MoveRight } from "lucide-react";
import { requestOtp, verifyOtp, registerUser } from "../api";

const PHONE_REGEX = /^(\+98|0)9[0-9]{9}$/;
const RESEND_SECONDS = 90;
const STEPS = ["phone", "otp", "register"] as const;
type Step = (typeof STEPS)[number];

function validatePhone(phone: string): string | null {
  if (!phone.trim()) return "شماره موبایل را وارد کنید";
  if (!PHONE_REGEX.test(phone.trim()))
    return "شماره موبایل معتبر نیست (مثال: ۰۹۱۲۳۴۵۶۷۸۹)";
  return null;
}

function validateName(value: string, label: string): string | null {
  if (!value.trim()) return `${label} را وارد کنید`;
  if (value.trim().length < 2) return `${label} باید حداقل ۲ حرف باشد`;
  return null;
}

interface AuthFormProps {
  callbackUrl: string;
}

export function AuthForm({ callbackUrl }: AuthFormProps) {
  const navigate = useNavigate();

  const [registrationToken, setRegistrationToken] = useState(
    () =>
      typeof window !== "undefined"
        ? (sessionStorage.getItem("auth_reg_token") ?? "")
        : "",
  );
  const [phone, setPhone] = useState(
    () =>
      typeof window !== "undefined"
        ? (sessionStorage.getItem("auth_reg_phone") ?? "")
        : "",
  );
  const [step, setStep] = useState<Step>(
    () =>
      typeof window !== "undefined" && sessionStorage.getItem("auth_reg_token")
        ? "register"
        : "phone",
  );

  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
  const [lastNameError, setLastNameError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startResendTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setResendTimer(RESEND_SECONDS);
    timerRef.current = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const requestOtpMutation = useMutation({
    mutationFn: () => requestOtp(phone),
    onSuccess: () => {
      setStep("otp");
      sessionStorage.setItem("auth_reg_phone", phone);
      startResendTimer();
    },
  });

  const devCode = requestOtpMutation.data?.dev_code;

  const verifyOtpMutation = useMutation({
    mutationFn: () => verifyOtp(phone, otp),
    onSuccess: (data) => {
      if (data.status === "existing") {
        sessionStorage.removeItem("auth_reg_phone");
        navigate({ to: callbackUrl as never });
      } else {
        setRegistrationToken(data.registration_token);
        sessionStorage.setItem("auth_reg_token", data.registration_token);
        setStep("register");
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: () => registerUser(firstName, lastName, registrationToken),
    onSuccess: () => {
      sessionStorage.removeItem("auth_reg_token");
      sessionStorage.removeItem("auth_reg_phone");
      navigate({ to: callbackUrl as never });
    },
  });

  const handlePhoneSubmit = () => {
    const err = validatePhone(phone);
    if (err) {
      setPhoneError(err);
      return;
    }
    setPhoneError(null);
    requestOtpMutation.mutate();
  };

  const handleResend = () => {
    setOtp("");
    verifyOtpMutation.reset();
    requestOtpMutation.reset();
    requestOtpMutation.mutate();
  };

  const handleBackToPhone = () => {
    setStep("phone");
    setOtp("");
    setPhoneError(null);
    if (timerRef.current) clearInterval(timerRef.current);
    requestOtpMutation.reset();
    verifyOtpMutation.reset();
    sessionStorage.removeItem("auth_reg_phone");
  };

  const handleRestart = () => {
    setStep("phone");
    setOtp("");
    setFirstName("");
    setLastName("");
    setFirstNameError(null);
    setLastNameError(null);
    setRegistrationToken("");
    sessionStorage.removeItem("auth_reg_token");
    sessionStorage.removeItem("auth_reg_phone");
    requestOtpMutation.reset();
    verifyOtpMutation.reset();
    registerMutation.reset();
  };

  const handleRegisterSubmit = () => {
    const fnErr = validateName(firstName, "نام");
    const lnErr = validateName(lastName, "نام خانوادگی");
    setFirstNameError(fnErr);
    setLastNameError(lnErr);
    if (fnErr || lnErr) return;
    registerMutation.mutate();
  };

  const serverError =
    requestOtpMutation.error?.message ??
    verifyOtpMutation.error?.message ??
    registerMutation.error?.message;

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-95 flex flex-col gap-6">
        {/* Brand */}
        <div className="text-center flex flex-col items-center gap-2">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-accent/10 border border-accent/20">
            <span className="text-3xl font-black text-accent leading-none">
              Z
            </span>
          </div>
          <span className="text-xs tracking-[0.2em] uppercase text-muted font-medium">
            z-games
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-surface border border-border overflow-hidden">
          {/* Accent top stripe */}
          <div className="h-0.5 bg-linear-to-l from-accent/0 via-accent to-accent/0" />

          <div className="p-7 flex flex-col gap-6">
            {/* Step dots */}
            <div className="flex justify-center gap-1.5">
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  className={`h-0.75 rounded-full transition-all duration-500 ${
                    i === stepIndex
                      ? "w-7 bg-accent"
                      : i < stepIndex
                        ? "w-4 bg-accent/35"
                        : "w-4 bg-border"
                  }`}
                />
              ))}
            </div>

            {/* ── Phone step ── */}
            {step === "phone" && (
              <div key="phone" className="step-enter flex flex-col gap-5">
                <div className="space-y-1">
                  <h1 className="text-lg font-bold">ورود یا ثبت‌نام</h1>
                  <p className="text-muted text-sm leading-relaxed">
                    شماره موبایل خود را وارد کنید
                  </p>
                </div>

                <TextField
                  aria-label="شماره موبایل"
                  isInvalid={!!phoneError}
                  fullWidth
                >
                  <Input
                    type="tel"
                    dir="ltr"
                    value={phone}
                    autoComplete="tel"
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (phoneError) setPhoneError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handlePhoneSubmit()}
                    placeholder="09xxxxxxxxx"
                    disabled={requestOtpMutation.isPending}
                    className="text-center text-lg tracking-widest"
                  />
                  <FieldError>{phoneError}</FieldError>
                </TextField>

                <Button
                  variant="primary"
                  fullWidth
                  isPending={requestOtpMutation.isPending}
                  onPress={handlePhoneSubmit}
                >
                  ادامه
                </Button>
              </div>
            )}

            {/* ── OTP step ── */}
            {step === "otp" && (
              <div key="otp" className="step-enter flex flex-col gap-5">
                <div className="space-y-1">
                  <h1 className="text-lg font-bold">کد تأیید</h1>
                  <p className="text-muted text-sm leading-relaxed">
                    کد ارسال‌شده به{" "}
                    <span
                      className="font-mono text-foreground font-semibold"
                      dir="ltr"
                    >
                      {phone}
                    </span>{" "}
                    را وارد کنید
                  </p>
                </div>

                {devCode && (
                  <div className="text-center py-2.5 px-4 rounded-xl bg-warning/10 border border-warning/30">
                    <p className="text-xs text-muted mb-1">
                      کد تأیید (محیط توسعه)
                    </p>
                    <p
                      className="font-mono text-2xl font-bold tracking-[0.5em] text-warning"
                      dir="ltr"
                    >
                      {devCode}
                    </p>
                  </div>
                )}

                <div className="flex justify-center" dir="ltr">
                  <InputOTP
                    aria-label="کد تأیید"
                    maxLength={5}
                    pattern={REGEXP_ONLY_DIGITS}
                    value={otp}
                    autoFocus
                    onChange={(val) => {
                      setOtp(val);
                      verifyOtpMutation.reset();
                    }}
                    onComplete={() => verifyOtpMutation.mutate()}
                    isDisabled={verifyOtpMutation.isPending}
                    isInvalid={!!verifyOtpMutation.error}
                  >
                    <InputOTP.Group className="gap-2">
                      {Array.from({ length: 5 }, (_, i) => (
                        <InputOTP.Slot
                          key={i}
                          className="size-12 rounded-xl bg-field-background border border-border text-lg font-bold"
                          index={i}
                        />
                      ))}
                    </InputOTP.Group>
                  </InputOTP>
                </div>

                <Button
                  variant="primary"
                  fullWidth
                  isPending={verifyOtpMutation.isPending}
                  isDisabled={otp.length < 5}
                  onPress={() => verifyOtpMutation.mutate()}
                >
                  تأیید کد
                </Button>

                <div className="flex items-center justify-between text-sm pt-1">
                  <Button
                    variant="ghost"
                    className="transition-colors items-center justify-center"
                    onPress={handleBackToPhone}
                  >
                    ویرایش شماره <MoveRight className="mr-1" />
                  </Button>

                  <Button
                    variant="ghost"
                    isDisabled={resendTimer > 0 || requestOtpMutation.isPending}
                    className="text-accent disabled:text-muted disabled:cursor-not-allowed"
                    onPress={handleResend}
                  >
                    {resendTimer > 0
                      ? `ارسال مجدد (${resendTimer})`
                      : "ارسال مجدد کد"}
                  </Button>
                </div>
              </div>
            )}

            {/* ── Register step ── */}
            {step === "register" && (
              <div key="register" className="step-enter flex flex-col gap-5">
                <div className="space-y-1">
                  <h1 className="text-lg font-bold">تکمیل ثبت‌نام</h1>
                  <p className="text-muted text-sm leading-relaxed">
                    اطلاعات خود را وارد کنید
                  </p>
                </div>

                <TextField
                  aria-label="نام"
                  value={firstName}
                  onChange={(val) => {
                    setFirstName(val);
                    if (firstNameError) setFirstNameError(null);
                  }}
                  isDisabled={registerMutation.isPending}
                  isInvalid={!!firstNameError}
                  fullWidth
                >
                  <Input placeholder="نام" autoComplete="given-name" />
                  <FieldError>{firstNameError}</FieldError>
                </TextField>

                <TextField
                  aria-label="نام خانوادگی"
                  value={lastName}
                  onChange={(val) => {
                    setLastName(val);
                    if (lastNameError) setLastNameError(null);
                  }}
                  isDisabled={registerMutation.isPending}
                  isInvalid={!!lastNameError}
                  fullWidth
                >
                  <Input placeholder="نام خانوادگی" autoComplete="family-name" />
                  <FieldError>{lastNameError}</FieldError>
                </TextField>

                <Button
                  variant="primary"
                  fullWidth
                  isPending={registerMutation.isPending}
                  onPress={handleRegisterSubmit}
                >
                  ثبت‌نام
                </Button>

                <div className="flex justify-start text-sm pt-1">
                  <Button
                    variant="ghost"
                    className="transition-colors items-center justify-center"
                    onPress={handleRestart}
                  >
                    شروع مجدد <MoveRight className="mr-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Server errors */}
            {serverError && (
              <Alert status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{serverError}</Alert.Description>
                </Alert.Content>
              </Alert>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted">
          ورود به معنای پذیرش{" "}
          <a
            href="/terms"
            className="text-foreground/60 underline underline-offset-2 hover:text-foreground transition-colors"
          >
            قوانین و شرایط استفاده
          </a>{" "}
          است
        </p>
      </div>
    </div>
  );
}
