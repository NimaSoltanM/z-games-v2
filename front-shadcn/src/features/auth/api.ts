import { apiFetch } from "@/lib/api-client"
import type { VerifyOtpResponse } from "./types"

export function requestOtp(phone: string) {
  return apiFetch<{ message: string; dev_code?: string }>("/auth/request-otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  })
}

export function verifyOtp(phone: string, code: string) {
  return apiFetch<VerifyOtpResponse>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  })
}

export function registerUser(firstName: string, lastName: string, registrationToken: string) {
  return apiFetch<{ message: string }>("/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${registrationToken}`,
    },
    body: JSON.stringify({ first_name: firstName, last_name: lastName }),
  })
}

export function logout() {
  return apiFetch<{ message: string }>("/auth/logout", { method: "POST" })
}
