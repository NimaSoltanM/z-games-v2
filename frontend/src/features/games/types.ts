export type Platform = "ps4" | "ps5" | "ps4_ps5";
export type PriceMode = "dynamic" | "fixed";

export type GameLink = {
  id: string;
  url: string;
};

export type Game = {
  id: string;
  name: string;
  cover_image: string | null;
  platform: Platform;
  price_mode: PriceMode;
  z2_price_usd: string | null;
  z3_price_usd: string | null;
  z2_price_toman: number | null;
  z3_price_toman: number | null;
  z2_slots: number | null;
  z3_slots: number | null;
  active: boolean;
  links: GameLink[];
  created_at: string;
  updated_at: string;
};

export type ExchangeRate = {
  id: number;
  usd_to_toman: number;
  updated_at: string;
} | null;

export type GamesParams = {
  page?: number;
  platform?: string;
  price_mode?: string;
  search?: string;
  sort?: string;
};

export type GamesListResponse = {
  games: Game[];
  exchange_rate: ExchangeRate;
};

export type PaginatedGamesResponse = {
  games: Game[];
  exchange_rate: ExchangeRate;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export type GameDetailResponse = {
  game: Game;
  exchange_rate: ExchangeRate;
};

export function calcPrice(
  game: Game,
  tier: "z2" | "z3",
  rate: ExchangeRate,
): number | null {
  if (game.price_mode === "fixed") {
    return tier === "z2" ? game.z2_price_toman : game.z3_price_toman;
  }
  const usd = tier === "z2" ? game.z2_price_usd : game.z3_price_usd;
  if (!usd || !rate) return null;
  return Math.round(parseFloat(usd) * rate.usd_to_toman);
}

export function formatToman(amount: number | null): string {
  if (amount === null) return "—";
  return amount.toLocaleString("fa-IR") + " تومان";
}

export const PLATFORM_LABEL: Record<Platform, string> = {
  ps4: "PS4",
  ps5: "PS5",
  ps4_ps5: "PS4 & PS5",
};
