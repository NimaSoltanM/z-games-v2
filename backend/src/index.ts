import { Elysia } from "elysia";
import { cron, Patterns } from "@elysia/cron";
import { auth } from "./modules/auth";
import { db } from "./database";
import { otp_codes } from "./database/schema";
import { lt } from "drizzle-orm";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const app = new Elysia()
  .use(
    cron({
      name: "otp-cleanup",
      pattern: Patterns.EVERY_DAY_AT_3AM,
      async run() {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const result = await db
          .delete(otp_codes)
          .where(lt(otp_codes.expires_at, cutoff))
          .returning({ id: otp_codes.id });
        console.log(
          `[OTP Cleanup] Deleted ${result.length} expired OTP records`,
        );
      },
    }),
  )
  .onError(({ code, error, status }) => {
    console.error(`[Error] code=${code}`, error);

    if (code === "VALIDATION") return;

    if (code === "NOT_FOUND") {
      return status(404, { message: "مسیر مورد نظر یافت نشد" });
    }

    return status(500, {
      message: "خطایی رخ داده است. لطفاً دوباره تلاش کنید",
    });
  })
  .use(auth)
  .get("/health", () => ({ status: "ok" }))
  .listen(process.env.PORT ?? 3000);

console.log(`Server running at ${app.server?.hostname}:${app.server?.port}`);
