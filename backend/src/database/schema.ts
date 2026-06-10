import { pgTable, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const users = pgTable("users", {
  id: varchar("id")
    .$defaultFn(() => createId())
    .primaryKey(),
  phone: varchar("phone", { length: 15 }).notNull().unique(),
  first_name: varchar("first_name", { length: 50 }),
  last_name: varchar("last_name", { length: 50 }),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const otp_codes = pgTable("otp_codes", {
  id: varchar("id")
    .$defaultFn(() => createId())
    .primaryKey(),
  phone: varchar("phone", { length: 15 }).notNull(),
  code: varchar("code", { length: 5 }).notNull(),
  expires_at: timestamp("expires_at").notNull(),
  used_at: timestamp("used_at"),
  attempts: integer("attempts").default(0).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const table = {
  users,
  otp_codes,
} as const;

export type Table = typeof table;
