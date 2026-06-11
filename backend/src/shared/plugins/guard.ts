import { Elysia } from "elysia";
import { jwt } from "@elysia/jwt";
import { db } from "../../database";
import { users } from "../../database/schema";
import { eq } from "drizzle-orm";
import type { UserRole } from "../../database/schema";

type CurrentUser = { id: string; phone: string; role: UserRole };

export const withCurrentUser = new Elysia({ name: "with-current-user" })
  .use(
    jwt({
      name: "authJwt",
      secret: process.env.JWT_SECRET!,
      exp: "30d",
    }),
  )
  .derive({ as: "scoped" }, async ({ cookie: { auth_token }, authJwt }) => {
    if (!auth_token?.value) return { currentUser: null as CurrentUser | null };

    const payload = await authJwt.verify(auth_token.value);
    if (!payload || payload.type !== "auth")
      return { currentUser: null as CurrentUser | null };

    const [user] = await db
      .select({ id: users.id, phone: users.phone, role: users.role })
      .from(users)
      .where(eq(users.id, payload.userId as string))
      .limit(1);

    return { currentUser: (user ?? null) as CurrentUser | null };
  });

export const requireAuth = new Elysia({ name: "require-auth" })
  .use(withCurrentUser)
  .onBeforeHandle({ as: "scoped" }, ({ currentUser, status }) => {
    if (!currentUser) return status(401, { message: "لطفاً وارد شوید" });
  });

export const requireAdmin = new Elysia({ name: "require-admin" })
  .use(withCurrentUser)
  .onBeforeHandle({ as: "scoped" }, ({ currentUser, status }) => {
    if (!currentUser) return status(401, { message: "لطفاً وارد شوید" });
    if (currentUser.role === "user")
      return status(403, { message: "دسترسی مجاز نیست" });
  });

export const requireSuperAdmin = new Elysia({ name: "require-super-admin" })
  .use(withCurrentUser)
  .onBeforeHandle({ as: "scoped" }, ({ currentUser, status }) => {
    if (!currentUser) return status(401, { message: "لطفاً وارد شوید" });
    if (currentUser.role !== "super_admin")
      return status(403, { message: "دسترسی مجاز نیست" });
  });
