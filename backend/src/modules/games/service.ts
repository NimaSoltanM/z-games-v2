import { db } from "../../database";
import { games, game_links, exchange_rate } from "../../database/schema";
import { eq, desc, inArray, and } from "drizzle-orm";
import type { Platform, PriceMode } from "../../database/schema";
import path from "path";
import { mkdir } from "fs/promises";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

const ALLOWED_IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif", "gif"]);

export async function saveUploadedFile(file: File): Promise<string> {
  await mkdir(UPLOADS_DIR, { recursive: true });
  const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  const ext = ALLOWED_IMAGE_EXTENSIONS.has(rawExt) ? rawExt : "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const dest = path.join(UPLOADS_DIR, filename);
  await Bun.write(dest, file);
  return `/uploads/${filename}`;
}

export type CreateGameInput = {
  name: string;
  platform: Platform;
  price_mode: PriceMode;
  z2_price_usd?: string;
  z3_price_usd?: string;
  z2_price_toman?: number;
  z3_price_toman?: number;
  z2_slots?: number;
  z3_slots?: number;
  cover_image?: string;
  links: [string, ...string[]]; // at least one
};

async function attachLinks<T extends { id: string }>(rows: T[]) {
  if (rows.length === 0) return rows.map((r) => ({ ...r, links: [] as { id: string; url: string }[] }));
  const ids = rows.map((r) => r.id);
  const allLinks = await db
    .select({ id: game_links.id, game_id: game_links.game_id, url: game_links.url })
    .from(game_links)
    .where(inArray(game_links.game_id, ids));
  return rows.map((r) => ({
    ...r,
    links: allLinks.filter((l) => l.game_id === r.id).map((l) => ({ id: l.id, url: l.url })),
  }));
}

export async function createGame(input: CreateGameInput) {
  const { links, ...gameData } = input;
  return db.transaction(async (tx) => {
    const [game] = await tx.insert(games).values(gameData).returning();
    const insertedLinks = await tx
      .insert(game_links)
      .values(links.map((url) => ({ game_id: game.id, url })))
      .returning({ id: game_links.id, url: game_links.url });
    return { ...game, links: insertedLinks };
  });
}

export async function updateGame(
  id: string,
  input: Partial<Omit<CreateGameInput, "links">> & { active?: boolean; links?: string[] },
) {
  const { links, ...gameData } = input;
  return db.transaction(async (tx) => {
    const [game] = await tx
      .update(games)
      .set({ ...gameData, updated_at: new Date() })
      .where(eq(games.id, id))
      .returning();

    if (!game) return null;

    if (links !== undefined) {
      await tx.delete(game_links).where(eq(game_links.game_id, id));
      if (links.length > 0) {
        await tx.insert(game_links).values(links.map((url) => ({ game_id: id, url })));
      }
    }

    const currentLinks = await tx
      .select({ id: game_links.id, url: game_links.url })
      .from(game_links)
      .where(eq(game_links.game_id, id));

    return { ...game, links: currentLinks };
  });
}

export async function deleteGame(id: string): Promise<boolean> {
  const [deleted] = await db.delete(games).where(eq(games.id, id)).returning({ id: games.id });
  return !!deleted;
}

export async function listAllGames() {
  const rows = await db.select().from(games).orderBy(desc(games.created_at));
  return attachLinks(rows);
}

export async function listActiveGames() {
  const rows = await db
    .select()
    .from(games)
    .where(eq(games.active, true))
    .orderBy(desc(games.created_at));
  return attachLinks(rows);
}

export async function getGameById(id: string, onlyActive = false) {
  const where = onlyActive
    ? and(eq(games.id, id), eq(games.active, true))
    : eq(games.id, id);
  const [game] = await db.select().from(games).where(where).limit(1);
  if (!game) return null;
  const [withLinks] = await attachLinks([game]);
  return withLinks;
}

export async function getExchangeRate() {
  const [row] = await db.select().from(exchange_rate).where(eq(exchange_rate.id, 1)).limit(1);
  return row ?? null;
}

export async function setExchangeRate(usd_to_toman: number) {
  const [row] = await db
    .insert(exchange_rate)
    .values({ id: 1, usd_to_toman })
    .onConflictDoUpdate({
      target: exchange_rate.id,
      set: { usd_to_toman, updated_at: new Date() },
    })
    .returning();
  return row;
}
