import { Elysia } from "elysia";
import { jwt } from "@elysia/jwt";
import { requestOtp, verifyOtp, register, AuthError } from "./service";
import { db } from "../../database";
import { users } from "../../database/schema";
import { eq } from "drizzle-orm";
import {
  iranianPhone,
  AUTH_COOKIE_OPTIONS,
  requestOtpBody,
  verifyOtpBody,
  registerBody,
} from "./validators";

const isProd = process.env.NODE_ENV === "production";

export const auth = new Elysia({ prefix: "/auth" })
  .use(
    jwt({
      name: "authJwt",
      secret: process.env.JWT_SECRET!,
      exp: "30d",
    }),
  )
  .use(
    jwt({
      name: "registrationJwt",
      secret: process.env.JWT_SECRET!,
      exp: "10m",
    }),
  )
  .get("/me", async ({ cookie: { auth_token }, authJwt, status }) => {
    if (!auth_token.value)
      return status(401, { message: "لطفاً وارد شوید" });

    const payload = await authJwt.verify(auth_token.value);
    if (!payload || payload.type !== "auth")
      return status(401, { message: "نشست منقضی شده است. لطفاً دوباره وارد شوید" });

    const [user] = await db
      .select({ first_name: users.first_name, last_name: users.last_name, role: users.role })
      .from(users)
      .where(eq(users.id, payload.userId as string))
      .limit(1);

    if (!user) return status(401, { message: "نشست منقضی شده است. لطفاً دوباره وارد شوید" });

    return {
      userId: payload.userId as string,
      phone: payload.phone as string,
      firstName: user.first_name ?? null,
      lastName: user.last_name ?? null,
      role: user.role,
    };
  })
  .post("/logout", ({ cookie: { auth_token } }) => {
    auth_token.remove();
    return { message: "خروج موفق" };
  })
  .post(
    "/request-otp",
    async ({ body, status }) => {
      try {
        const { code } = await requestOtp(body.phone);
        return {
          message: "کد تأیید ارسال شد",
          ...(isProd ? {} : { dev_code: code }),
        };
      } catch (error) {
        if (error instanceof AuthError && error.code === "RATE_LIMITED") {
          return status(429, {
            message: "درخواست‌های زیادی ارسال شده‌اید. لطفاً چند دقیقه بعد تلاش کنید",
          });
        }
        throw error;
      }
    },
    { body: requestOtpBody },
  )
  .post(
    "/verify-otp",
    async ({ body, status, authJwt, registrationJwt, cookie: { auth_token } }) => {
      try {
        const result = await verifyOtp(body.phone, body.code);

        if (result.status === "existing") {
          const token = await authJwt.sign({
            userId: result.userId,
            phone: body.phone,
            type: "auth",
          });
          auth_token.value = token;
          auth_token.set(AUTH_COOKIE_OPTIONS);
          return { status: "existing" as const };
        }

        const registration_token = await registrationJwt.sign({
          phone: body.phone,
          type: "registration",
        });
        return { status: "new" as const, registration_token };
      } catch (error) {
        if (error instanceof AuthError) {
          switch (error.code) {
            case "OTP_NOT_FOUND":
              return status(400, { message: "کد تأیید نامعتبر یا منقضی شده است" });
            case "OTP_INVALID":
              return status(400, { message: "کد تأیید اشتباه است" });
            case "OTP_BURNED":
              return status(400, {
                message: "این کد غیرفعال شده است. لطفاً کد جدیدی درخواست کنید",
              });
          }
        }
        throw error;
      }
    },
    { body: verifyOtpBody },
  )
  .post(
    "/register",
    async ({ body, headers, status, authJwt, registrationJwt, cookie: { auth_token } }) => {
      const authorization = headers["authorization"];

      if (!authorization?.startsWith("Bearer ")) {
        return status(401, { message: "احراز هویت الزامی است" });
      }

      const token = authorization.slice(7);
      const payload = await registrationJwt.verify(token);

      if (
        !payload ||
        payload.type !== "registration" ||
        typeof payload.phone !== "string"
      ) {
        return status(401, { message: "توکن نامعتبر یا منقضی شده است" });
      }

      try {
        const user = await register(payload.phone, body.first_name, body.last_name);
        const authToken = await authJwt.sign({
          userId: user.id,
          phone: user.phone,
          type: "auth",
        });
        auth_token.value = authToken;
        auth_token.set(AUTH_COOKIE_OPTIONS);
        return { message: "ثبت‌نام موفق" };
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("unique constraint")
        ) {
          return status(409, { message: "این شماره تلفن قبلاً ثبت شده است" });
        }
        throw error;
      }
    },
    { body: registerBody },
  );
