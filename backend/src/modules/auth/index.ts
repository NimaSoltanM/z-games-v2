import { Elysia, t } from "elysia";
import { jwt } from "@elysia/jwt";
import { AuthService } from "./service";
import { db_model } from "../../database/model";

const { phone } = db_model.insert.users;

const iranianPhone = t.String({ pattern: "^(\\+98|0)9[0-9]{9}$" });

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
  .post(
    "/request-otp",
    async ({ body, status }) => {
      try {
        await AuthService.requestOtp(body.phone);
        return { message: "کد تأیید ارسال شد" };
      } catch (error) {
        if (error instanceof Error && error.message === "RATE_LIMITED") {
          return status(429, {
            message:
              "درخواست‌های زیادی ارسال شده‌اید. لطفاً چند دقیقه بعد تلاش کنید",
          });
        }
        throw error;
      }
    },
    {
      body: t.Object({
        phone: iranianPhone,
      }),
    },
  )
  .post(
    "/verify-otp",
    async ({ body, status, authJwt, registrationJwt }) => {
      try {
        const result = await AuthService.verifyOtp(body.phone, body.code);

        if (result.status === "existing") {
          const token = await authJwt.sign({
            userId: result.userId,
            phone: body.phone,
          });
          return { status: "existing" as const, token };
        }

        const registration_token = await registrationJwt.sign({
          phone: body.phone,
          type: "registration",
        });
        return { status: "new" as const, registration_token };
      } catch (error) {
        if (error instanceof Error) {
          switch (error.message) {
            case "OTP_NOT_FOUND":
              return status(400, {
                message: "کد تأیید نامعتبر یا منقضی شده است",
              });
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
    {
      body: t.Object({
        phone: iranianPhone,
        code: t.String({ pattern: "^[0-9]{5}$" }),
      }),
    },
  )
  .post(
    "/register",
    async ({ body, headers, status, authJwt, registrationJwt }) => {
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
        const user = await AuthService.register(
          payload.phone,
          body.first_name,
          body.last_name,
        );
        const authToken = await authJwt.sign({
          userId: user.id,
          phone: user.phone,
        });
        return { token: authToken };
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
    {
      body: t.Object({
        first_name: t.String({ minLength: 1 }),
        last_name: t.String({ minLength: 1 }),
      }),
    },
  );
