import { db } from "../../database";
import { otp_codes, users } from "../../database/schema";
import { eq, and, gt, isNull, count, desc, sql } from "drizzle-orm";

const OTP_EXPIRY_MINUTES = 5;
const OTP_RATE_LIMIT = 3;
const OTP_RATE_LIMIT_WINDOW_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 3;

export class AuthError extends Error {
  constructor(
    public readonly code:
      | "RATE_LIMITED"
      | "OTP_NOT_FOUND"
      | "OTP_INVALID"
      | "OTP_BURNED",
  ) {
    super(code);
    this.name = "AuthError";
  }
}

function generateCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String((array[0] % 90000) + 10000);
}

export function normalizePhone(phone: string): string {
  if (phone.startsWith("+98")) return "0" + phone.slice(3);
  return phone;
}

export async function requestOtp(rawPhone: string): Promise<{ code: string }> {
  const phone = normalizePhone(rawPhone);
  const code = generateCode();
  const now = Date.now();
  const windowStart = new Date(now - OTP_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
  const expiresAt = new Date(now + OTP_EXPIRY_MINUTES * 60 * 1000);

  await db.transaction(async (tx) => {
    // Advisory lock serializes concurrent requests for the same phone number,
    // preventing the race condition in the rate limit count check.
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${phone}))`);

    const [{ value: requestCount }] = await tx
      .select({ value: count() })
      .from(otp_codes)
      .where(
        and(eq(otp_codes.phone, phone), gt(otp_codes.created_at, windowStart)),
      );

    if (Number(requestCount) >= OTP_RATE_LIMIT) {
      throw new AuthError("RATE_LIMITED");
    }

    await tx.insert(otp_codes).values({ phone, code, expires_at: expiresAt });
  });

  // TODO: send via real SMS provider
  return { code };
}

export async function verifyOtp(
  rawPhone: string,
  code: string,
): Promise<{ status: "existing"; userId: string } | { status: "new" }> {
  const phone = normalizePhone(rawPhone);

  return db.transaction(async (tx) => {
    const [otp] = await tx
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
      throw new AuthError("OTP_NOT_FOUND");
    }

    if (otp.code !== code) {
      const newAttempts = otp.attempts + 1;

      if (newAttempts >= OTP_MAX_ATTEMPTS) {
        await tx
          .update(otp_codes)
          .set({ attempts: newAttempts, used_at: new Date() })
          .where(eq(otp_codes.id, otp.id));
        throw new AuthError("OTP_BURNED");
      }

      await tx
        .update(otp_codes)
        .set({ attempts: newAttempts })
        .where(eq(otp_codes.id, otp.id));

      throw new AuthError("OTP_INVALID");
    }

    const [claimed] = await tx
      .update(otp_codes)
      .set({ used_at: new Date() })
      .where(and(eq(otp_codes.id, otp.id), isNull(otp_codes.used_at)))
      .returning();

    if (!claimed) throw new AuthError("OTP_NOT_FOUND");

    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .limit(1);

    return user
      ? { status: "existing" as const, userId: user.id }
      : { status: "new" as const };
  });
}

export async function register(
  rawPhone: string,
  firstName: string,
  lastName: string,
) {
  const phone = normalizePhone(rawPhone);
  const superAdminPhone = process.env.SUPER_ADMIN_PHONE
    ? normalizePhone(process.env.SUPER_ADMIN_PHONE)
    : null;
  const role = superAdminPhone === phone ? "super_admin" as const : "user" as const;

  const [user] = await db
    .insert(users)
    .values({ phone, first_name: firstName, last_name: lastName, role })
    .returning();

  return user;
}
