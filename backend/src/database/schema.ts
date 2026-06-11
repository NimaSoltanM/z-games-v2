import { pgTable, varchar, timestamp, integer, index, pgEnum, boolean, numeric } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const userRoleEnum = pgEnum("user_role", ["user", "admin", "super_admin"]);

export type UserRole = typeof userRoleEnum.enumValues[number];

export const users = pgTable("users", {
  id: varchar("id")
    .$defaultFn(() => createId())
    .primaryKey(),
  phone: varchar("phone", { length: 15 }).notNull().unique(),
  first_name: varchar("first_name", { length: 50 }),
  last_name: varchar("last_name", { length: 50 }),
  role: userRoleEnum("role").default("user").notNull(),
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
}, (table) => [
  index("otp_codes_phone_idx").on(table.phone),
]);

export const platformEnum = pgEnum("platform", ["ps4", "ps5", "ps4_ps5"]);
export const priceModeEnum = pgEnum("price_mode", ["dynamic", "fixed"]);

export type Platform = typeof platformEnum.enumValues[number];
export type PriceMode = typeof priceModeEnum.enumValues[number];

export const games = pgTable("games", {
  id: varchar("id")
    .$defaultFn(() => createId())
    .primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  cover_image: varchar("cover_image", { length: 500 }),
  platform: platformEnum("platform").notNull(),
  price_mode: priceModeEnum("price_mode").default("dynamic").notNull(),
  // dynamic pricing (USD)
  z2_price_usd: numeric("z2_price_usd", { precision: 8, scale: 2 }),
  z3_price_usd: numeric("z3_price_usd", { precision: 8, scale: 2 }),
  // fixed pricing (Toman)
  z2_price_toman: integer("z2_price_toman"),
  z3_price_toman: integer("z3_price_toman"),
  // slot tracking (nullable = not tracking)
  z2_slots: integer("z2_slots"),
  z3_slots: integer("z3_slots"),
  active: boolean("active").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const game_links = pgTable("game_links", {
  id: varchar("id")
    .$defaultFn(() => createId())
    .primaryKey(),
  game_id: varchar("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  url: varchar("url", { length: 500 }).notNull().unique(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// single-row table — holds the current USD/Toman exchange rate
export const exchange_rate = pgTable("exchange_rate", {
  id: integer("id").primaryKey().default(1),
  usd_to_toman: integer("usd_to_toman").notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const table = {
  users,
  otp_codes,
  games,
  game_links,
  exchange_rate,
  userRoleEnum,
  platformEnum,
  priceModeEnum,
} as const;

export type Table = typeof table;
