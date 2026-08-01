type UserRole = "user" | "admin" | "super_admin"

export type MeResponse = {
  userId: string
  phone: string
  firstName: string | null
  lastName: string | null
  role: UserRole
}

export type VerifyOtpResponse =
  | { status: "existing" }
  | { status: "new"; registration_token: string }
