import { db } from "../../database";
import { otp_codes, users } from "../../database/schema";
import { eq, and, gt, isNull, count, desc } from "drizzle-orm";

const OTP_EXPIRY_MINUTES = 5;
const OTP_RATE_LIMIT = 3;
const OTP_RATE_LIMIT_WINDOW_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 3;

export abstract class AuthService {
  private static generateCode(): string {
    return String(Math.floor(10000 + Math.random() * 90000));
  }

  static normalizePhone(phone: string): string {
    if (phone.startsWith("+98")) return "0" + phone.slice(3);
    return phone;
  }

  static async requestOtp(rawPhone: string): Promise<{ code: string }> {
    const phone = AuthService.normalizePhone(rawPhone);

    const windowStart = new Date(
      Date.now() - OTP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    );

    const [{ value: requestCount }] = await db
      .select({ value: count() })
      .from(otp_codes)
      .where(
        and(eq(otp_codes.phone, phone), gt(otp_codes.created_at, windowStart)),
      );

    if (Number(requestCount) >= OTP_RATE_LIMIT) {
      throw new Error("RATE_LIMITED");
    }

    const code = AuthService.generateCode();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await db.insert(otp_codes).values({ phone, code, expires_at: expiresAt });

    // TODO: replace with real SMS provider
    console.log(`[OTP] phone=${phone} code=${code}`);

    return { code };
  }

  static async verifyOtp(
    rawPhone: string,
    code: string,
  ): Promise<{ status: "existing"; userId: string } | { status: "new" }> {
    const phone = AuthService.normalizePhone(rawPhone);

    const [otp] = await db
      .select()
      .from(otp_codes)
      .where(
        and(
          eq(otp_codes.phone, phone),
          isNull(otp_codes.used_at),
          gt(otp_codes.expires_at, new Date()),
        ),
      )
      .orderBy(desc(otp_codes.created_at))
      .limit(1);

    if (!otp) {
      throw new Error("OTP_NOT_FOUND");
    }

    if (otp.code !== code) {
      const newAttempts = otp.attempts + 1;

      if (newAttempts >= OTP_MAX_ATTEMPTS) {
        await db
          .update(otp_codes)
          .set({ attempts: newAttempts, used_at: new Date() })
          .where(eq(otp_codes.id, otp.id));
        throw new Error("OTP_BURNED");
      }

      await db
        .update(otp_codes)
        .set({ attempts: newAttempts })
        .where(eq(otp_codes.id, otp.id));

      throw new Error("OTP_INVALID");
    }

    await db
      .update(otp_codes)
      .set({ used_at: new Date() })
      .where(eq(otp_codes.id, otp.id));

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    if (user) {
      return { status: "existing", userId: user.id };
    }

    return { status: "new" };
  }

  static async register(rawPhone: string, firstName: string, lastName: string) {
    const phone = AuthService.normalizePhone(rawPhone);

    const [user] = await db
      .insert(users)
      .values({ phone, first_name: firstName, last_name: lastName })
      .returning();

    return user;
  }
}
