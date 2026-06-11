import { Elysia } from "elysia";
import { db } from "../../database";
import { users } from "../../database/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "../../database/schema";
import { jwtVerify } from "jose";

type CurrentUser = { id: string; phone: string; role: UserRole };

console.log("[guard.ts] MODULE LOADED");

async function verifyAuthToken(token: string): Promise<{ userId: string; phone: string } | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    if (!payload || payload.type !== "auth" || typeof payload.userId !== "string") return null;
    return { userId: payload.userId, phone: payload.phone as string };
  } catch {
    return null;
  }
}

async function resolveUser(cookieValue: string | undefined): Promise<CurrentUser | null> {
  if (!cookieValue) return null;
  const verified = await verifyAuthToken(cookieValue);
  if (!verified) return null;
  const [user] = await db
    .select({ id: users.id, phone: users.phone, role: users.role })
    .from(users)
    .where(eq(users.id, verified.userId))
    .limit(1);
  return user ?? null;
}

console.log("[guard.ts] creating requireAdmin...");
export const requireAdmin = new Elysia()
  .derive({ as: "scoped" }, async ({ cookie: { auth_token } }) => {
    process.stdout.write("[DERIVE] running\n");
    const currentUser = await resolveUser(auth_token?.value);
    process.stdout.write("[DERIVE] user: " + (currentUser?.role ?? "null") + "\n");
    return { currentUser: currentUser as CurrentUser | null };
  })
  .onBeforeHandle({ as: "scoped" }, ({ currentUser, status }) => {
    process.stdout.write("[GUARD] user: " + (currentUser?.role ?? "null") + "\n");
    if (!currentUser) return status(401, { message: "لطفاً وارد شوید", debug: "guard_fired" });
    if (currentUser.role === "user") return status(403, { message: "دسترسی مجاز نیست" });
  });

export const requireAuth = new Elysia()
  .derive({ as: "scoped" }, async ({ cookie: { auth_token } }) => ({
    currentUser: (await resolveUser(auth_token?.value)) as CurrentUser | null,
  }))
  .onBeforeHandle({ as: "scoped" }, ({ currentUser, status }) => {
    if (!currentUser) return status(401, { message: "لطفاً وارد شوید" });
  });

export const requireSuperAdmin = new Elysia()
  .derive({ as: "scoped" }, async ({ cookie: { auth_token } }) => ({
    currentUser: (await resolveUser(auth_token?.value)) as CurrentUser | null,
  }))
  .onBeforeHandle({ as: "scoped" }, ({ currentUser, status }) => {
    if (!currentUser) return status(401, { message: "لطفاً وارد شوید" });
    if (currentUser.role !== "super_admin") return status(403, { message: "دسترسی مجاز نیست" });
  });

export const withCurrentUser = new Elysia()
  .derive({ as: "scoped" }, async ({ cookie: { auth_token } }) => ({
    currentUser: (await resolveUser(auth_token?.value)) as CurrentUser | null,
  }));
