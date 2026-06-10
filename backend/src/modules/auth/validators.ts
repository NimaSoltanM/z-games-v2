import { t } from "elysia";

export const iranianPhone = t.String({ pattern: "^(\\+98|0)9[0-9]{9}$" });

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 60 * 60 * 24 * 30,
  path: "/",
} as const;

export const requestOtpBody = t.Object({ phone: iranianPhone });

export const verifyOtpBody = t.Object({
  phone: iranianPhone,
  code: t.String({ pattern: "^[0-9]{5}$" }),
});

export const registerBody = t.Object({
  first_name: t.String({ minLength: 2, maxLength: 50 }),
  last_name: t.String({ minLength: 2, maxLength: 50 }),
});
