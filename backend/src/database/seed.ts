import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { games, game_links, exchange_rate } from "./schema";
import { createId } from "@paralleldrive/cuid2";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const gameData: {
  name: string;
  platform: "ps4" | "ps5" | "ps4_ps5";
  price_mode: "dynamic" | "fixed";
  z2_price_usd?: string;
  z3_price_usd?: string;
  z2_price_toman?: number;
  z3_price_toman?: number;
  active: boolean;
  links: [string, string?];
}[] = [
  // ── PS5 exclusives ────────────────────────────────────────────
  {
    name: "God of War Ragnarök",
    platform: "ps5",
    price_mode: "dynamic",
    z2_price_usd: "5.99",
    z3_price_usd: "3.49",
    active: true,
    links: ["https://store.playstation.com/en-us/product/UP9000-PPSA04344_00-GOWRAGNAROK00000"],
  },
  {
    name: "Spider-Man 2",
    platform: "ps5",
    price_mode: "dynamic",
    z2_price_usd: "6.99",
    z3_price_usd: "3.99",
    active: true,
    links: ["https://store.playstation.com/en-us/product/UP9000-PPSA08328_00-MARVELSPM2000000"],
  },
  {
    name: "Demon's Souls",
    platform: "ps5",
    price_mode: "dynamic",
    z2_price_usd: "4.49",
    z3_price_usd: "2.49",
    active: true,
    links: ["https://store.playstation.com/en-us/product/UP9000-PPSA01350_00-DEMONSSOULSFULL0"],
  },
  {
    name: "Returnal",
    platform: "ps5",
    price_mode: "dynamic",
    z2_price_usd: "4.99",
    z3_price_usd: "2.99",
    active: true,
    links: ["https://store.playstation.com/en-us/product/UP9000-PPSA03834_00-RETURNAL0000PS50"],
  },
  {
    name: "Ratchet & Clank: Rift Apart",
    platform: "ps5",
    price_mode: "dynamic",
    z2_price_usd: "4.99",
    z3_price_usd: "2.99",
    active: true,
    links: ["https://store.playstation.com/en-us/product/UP9000-PPSA01325_00-RATCHETPS5000000"],
  },
  {
    name: "Astro's Playroom",
    platform: "ps5",
    price_mode: "dynamic",
    z2_price_usd: "2.99",
    z3_price_usd: "1.49",
    active: true,
    links: ["https://store.playstation.com/en-us/product/UP9000-PPSA01295_00-ASTROPSROOM00000"],
  },

  // ── PS4 exclusives ────────────────────────────────────────────
  {
    name: "Bloodborne",
    platform: "ps4",
    price_mode: "dynamic",
    z2_price_usd: "3.99",
    z3_price_usd: "1.99",
    active: true,
    links: ["https://store.playstation.com/en-us/product/UP0002-CUSA00900_00-BLOODBORNE0000EU"],
  },
  {
    name: "The Last of Us Part I",
    platform: "ps4",
    price_mode: "dynamic",
    z2_price_usd: "5.49",
    z3_price_usd: "2.99",
    active: true,
    links: ["https://store.playstation.com/en-us/product/UP9000-CUSA00552_00-THELASTOFUSPART1"],
  },
  {
    name: "Ghost of Tsushima",
    platform: "ps4",
    price_mode: "dynamic",
    z2_price_usd: "4.99",
    z3_price_usd: "2.49",
    active: true,
    links: ["https://store.playstation.com/en-us/product/UP9000-CUSA18368_00-GHOSTOFTSUSHIMA0"],
  },
  {
    name: "Horizon Zero Dawn",
    platform: "ps4",
    price_mode: "dynamic",
    z2_price_usd: "3.49",
    z3_price_usd: "1.99",
    active: true,
    links: ["https://store.playstation.com/en-us/product/UP9000-CUSA07710_00-HORIZONZERODAWN0"],
  },
  {
    name: "Marvel's Spider-Man",
    platform: "ps4",
    price_mode: "dynamic",
    z2_price_usd: "3.99",
    z3_price_usd: "1.99",
    active: true,
    links: ["https://store.playstation.com/en-us/product/UP9000-CUSA02299_00-MARVELSSPIDERMAN"],
  },
  {
    name: "God of War (2018)",
    platform: "ps4",
    price_mode: "dynamic",
    z2_price_usd: "3.99",
    z3_price_usd: "1.99",
    active: true,
    links: ["https://store.playstation.com/en-us/product/UP9000-CUSA07408_00-GODOFWAR00000000"],
  },
  {
    name: "Death Stranding",
    platform: "ps4",
    price_mode: "dynamic",
    z2_price_usd: "4.49",
    z3_price_usd: "2.49",
    active: true,
    links: ["https://store.playstation.com/en-us/product/UP1088-CUSA17009_00-DEATHSTRANDINGPS"],
  },
  {
    name: "Sekiro: Shadows Die Twice",
    platform: "ps4",
    price_mode: "dynamic",
    z2_price_usd: "4.49",
    z3_price_usd: "2.49",
    active: true,
    links: ["https://store.playstation.com/en-us/product/UP0002-CUSA13363_00-SEKIROSHADOWSDIE"],
  },

  // ── Cross-gen PS4 & PS5 ───────────────────────────────────────
  {
    name: "Elden Ring",
    platform: "ps4_ps5",
    price_mode: "dynamic",
    z2_price_usd: "5.99",
    z3_price_usd: "3.49",
    active: true,
    links: [
      "https://store.playstation.com/en-us/product/UP0002-CUSA28767_00-ELDENRING0000000",
      "https://store.playstation.com/en-us/product/UP0002-PPSA01759_00-ELDENRING0000PS5",
    ],
  },
  {
    name: "Red Dead Redemption 2",
    platform: "ps4_ps5",
    price_mode: "dynamic",
    z2_price_usd: "4.99",
    z3_price_usd: "2.99",
    active: true,
    links: [
      "https://store.playstation.com/en-us/product/UP1004-CUSA08519_00-REDDEADREDEMPT2S",
      "https://store.playstation.com/en-us/product/UP1004-PPSA07780_00-REDDEADREDEMPT25",
    ],
  },
  {
    name: "GTA V",
    platform: "ps4_ps5",
    price_mode: "dynamic",
    z2_price_usd: "3.49",
    z3_price_usd: "1.99",
    active: true,
    links: [
      "https://store.playstation.com/en-us/product/UP1004-CUSA00419_00-GTAVDIGITALDOWNL",
      "https://store.playstation.com/en-us/product/UP1004-PPSA03420_00-GTAVCOMBOBUNDLE0",
    ],
  },
  {
    name: "Cyberpunk 2077",
    platform: "ps4_ps5",
    price_mode: "dynamic",
    z2_price_usd: "4.99",
    z3_price_usd: "2.99",
    active: true,
    links: [
      "https://store.playstation.com/en-us/product/UP4497-CUSA16596_00-CYBERPUNK20770000",
      "https://store.playstation.com/en-us/product/UP4497-PPSA01521_00-CYBERPUNK2077PS50",
    ],
  },
  {
    name: "The Last of Us Part II",
    platform: "ps4_ps5",
    price_mode: "dynamic",
    z2_price_usd: "4.99",
    z3_price_usd: "2.99",
    active: true,
    links: [
      "https://store.playstation.com/en-us/product/UP9000-CUSA07820_00-THELASTOFUSPART2",
      "https://store.playstation.com/en-us/product/UP9000-PPSA01697_00-THELASTOFUSPT2R0",
    ],
  },
  {
    name: "Horizon Forbidden West",
    platform: "ps4_ps5",
    price_mode: "dynamic",
    z2_price_usd: "5.49",
    z3_price_usd: "3.49",
    active: true,
    links: [
      "https://store.playstation.com/en-us/product/UP9000-CUSA28842_00-HFWPS4FULLGAME00",
      "https://store.playstation.com/en-us/product/UP9000-PPSA01374_00-HFWPS5FULLGAME00",
    ],
  },
  {
    name: "It Takes Two",
    platform: "ps4_ps5",
    price_mode: "dynamic",
    z2_price_usd: "3.49",
    z3_price_usd: "1.99",
    active: true,
    links: [
      "https://store.playstation.com/en-us/product/UP0006-CUSA26471_00-ITTAKESTWOENTPAK",
      "https://store.playstation.com/en-us/product/UP0006-PPSA02342_00-ITTAKESTWOPS5PKG",
    ],
  },
  {
    name: "Mortal Kombat 11",
    platform: "ps4_ps5",
    price_mode: "dynamic",
    z2_price_usd: "3.99",
    z3_price_usd: "1.99",
    active: true,
    links: [
      "https://store.playstation.com/en-us/product/UP1017-CUSA13401_00-MORTALKOMBAT11US",
      "https://store.playstation.com/en-us/product/UP1017-PPSA02344_00-MK11ULTIMATEPS50",
    ],
  },
  {
    name: "FIFA 24",
    platform: "ps4_ps5",
    price_mode: "dynamic",
    z2_price_usd: "4.49",
    z3_price_usd: "2.49",
    active: true,
    links: [
      "https://store.playstation.com/en-us/product/UP0006-CUSA33959_00-FIFA24STANDARDPS4",
      "https://store.playstation.com/en-us/product/UP0006-PPSA12315_00-FIFA24STANDARDPS5",
    ],
  },

  // ── Fixed pricing ─────────────────────────────────────────────
  {
    name: "Minecraft",
    platform: "ps4_ps5",
    price_mode: "fixed",
    z2_price_toman: 380000,
    z3_price_toman: 190000,
    active: true,
    links: ["https://store.playstation.com/en-us/product/UP4433-CUSA00744_00-MINECRAFTPS40001"],
  },
  {
    name: "Rocket League",
    platform: "ps4_ps5",
    price_mode: "fixed",
    z2_price_toman: 290000,
    z3_price_toman: 150000,
    active: true,
    links: ["https://store.playstation.com/en-us/product/UP0700-CUSA01433_00-ROCKETLEAGUE0000"],
  },

  // ── Inactive (coming soon) ────────────────────────────────────
  {
    name: "GTA 6",
    platform: "ps5",
    price_mode: "dynamic",
    z2_price_usd: "7.99",
    z3_price_usd: "4.99",
    active: false,
    links: ["https://store.playstation.com/en-us/product/UP1004-PPSA09249_00-GTA6PLACEHOLDER0"],
  },
];

async function seed() {
  console.log("Seeding exchange rate...");
  await db
    .insert(exchange_rate)
    .values({ id: 1, usd_to_toman: 95000 })
    .onConflictDoUpdate({
      target: exchange_rate.id,
      set: { usd_to_toman: 95000, updated_at: new Date() },
    });

  console.log(`Seeding ${gameData.length} games...`);
  for (const { links, ...data } of gameData) {
    const id = createId();
    await db.insert(games).values({ id, ...data }).onConflictDoNothing();
    for (const url of links) {
      if (url) await db.insert(game_links).values({ game_id: id, url }).onConflictDoNothing();
    }
  }

  console.log("Done.");
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
