import { Elysia, t } from "elysia";
import { requireAdmin } from "../../shared/plugins/guard";
import {
  createGame,
  updateGame,
  deleteGame,
  listAllGames,
  listActiveGames,
  getGameById,
  getExchangeRate,
  setExchangeRate,
  saveUploadedFile,
} from "./service";

const platformValues = ["ps4", "ps5", "ps4_ps5"] as const;
const priceModeValues = ["dynamic", "fixed"] as const;

const psStoreUrl = t.String({
  pattern: "^https://store\\.playstation\\.com/.+",
  error: "لینک باید از store.playstation.com باشد",
});

function parseLinks(link_1?: string, link_2?: string, status?: Function):
  | { ok: true; links: string[] }
  | { ok: false; response: unknown } {
  if (!link_1) return { ok: true, links: [] };
  if (link_2) {
    if (link_2 === link_1)
      return { ok: false, response: (status as any)(400, { message: "لینک‌ها نباید تکراری باشند" }) };
    return { ok: true, links: [link_1, link_2] };
  }
  return { ok: true, links: [link_1] };
}

export const gamesRouter = new Elysia({ prefix: "/games" })
  // ── Public routes ──────────────────────────────────────────────
  .get("/", async () => {
    const [gamesList, rate] = await Promise.all([listActiveGames(), getExchangeRate()]);
    return { games: gamesList, exchange_rate: rate };
  })
  .get("/:id", async ({ params, status }) => {
    const [game, rate] = await Promise.all([
      getGameById(params.id, true),
      getExchangeRate(),
    ]);
    if (!game) return status(404, { message: "بازی مورد نظر یافت نشد" });
    return { game, exchange_rate: rate };
  })

  // ── Admin routes ───────────────────────────────────────────────
  .use(requireAdmin)
  .get("/admin/test-no-auth", () => ({ reached: true, msg: "admin route reached without auth" }))
  .get("/admin/all", async () => {
    const [gamesList, rate] = await Promise.all([listAllGames(), getExchangeRate()]);
    return { games: gamesList, exchange_rate: rate };
  })
  .post(
    "/admin",
    async ({ body, status }) => {
      const parsed = parseLinks(body.link_1, body.link_2, status);
      if (!parsed.ok) return parsed.response;

      let cover_image: string | undefined;
      if (body.cover_image) cover_image = await saveUploadedFile(body.cover_image);

      try {
        return await createGame({
          name: body.name,
          platform: body.platform,
          price_mode: body.price_mode,
          z2_price_usd: body.z2_price_usd,
          z3_price_usd: body.z3_price_usd,
          z2_price_toman: body.z2_price_toman,
          z3_price_toman: body.z3_price_toman,
          z2_slots: body.z2_slots,
          z3_slots: body.z3_slots,
          cover_image,
          links: parsed.links as [string, ...string[]],
        });
      } catch (error) {
        if (error instanceof Error && error.message.includes("unique constraint"))
          return status(409, { message: "یک یا چند لینک قبلاً برای بازی دیگری ثبت شده است" });
        throw error;
      }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1, maxLength: 200 }),
        platform: t.Union(platformValues.map((v) => t.Literal(v))),
        price_mode: t.Union(priceModeValues.map((v) => t.Literal(v))),
        link_1: psStoreUrl,
        link_2: t.Optional(psStoreUrl),
        z2_price_usd: t.Optional(t.String()),
        z3_price_usd: t.Optional(t.String()),
        z2_price_toman: t.Optional(t.Number()),
        z3_price_toman: t.Optional(t.Number()),
        z2_slots: t.Optional(t.Number()),
        z3_slots: t.Optional(t.Number()),
        cover_image: t.Optional(t.File({ format: "image/*" })),
      }),
    },
  )
  .patch(
    "/admin/:id",
    async ({ params, body, status }) => {
      // link_2 without link_1 is ambiguous — reject it
      if (body.link_2 && !body.link_1)
        return status(400, { message: "برای ثبت لینک دوم، لینک اول نیز الزامی است" });

      let links: string[] | undefined;
      if (body.link_1 !== undefined) {
        const parsed = parseLinks(body.link_1, body.link_2, status);
        if (!parsed.ok) return parsed.response;
        links = parsed.links;
      }

      let cover_image: string | undefined;
      if (body.cover_image) cover_image = await saveUploadedFile(body.cover_image);

      try {
        const game = await updateGame(params.id, {
          name: body.name,
          platform: body.platform,
          price_mode: body.price_mode,
          z2_price_usd: body.z2_price_usd,
          z3_price_usd: body.z3_price_usd,
          z2_price_toman: body.z2_price_toman,
          z3_price_toman: body.z3_price_toman,
          z2_slots: body.z2_slots,
          z3_slots: body.z3_slots,
          active: body.active,
          links,
          ...(cover_image ? { cover_image } : {}),
        });
        if (!game) return status(404, { message: "بازی مورد نظر یافت نشد" });
        return game;
      } catch (error) {
        if (error instanceof Error && error.message.includes("unique constraint"))
          return status(409, { message: "یک یا چند لینک قبلاً برای بازی دیگری ثبت شده است" });
        throw error;
      }
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 200 })),
        platform: t.Optional(t.Union(platformValues.map((v) => t.Literal(v)))),
        price_mode: t.Optional(t.Union(priceModeValues.map((v) => t.Literal(v)))),
        link_1: t.Optional(psStoreUrl),
        link_2: t.Optional(psStoreUrl),
        z2_price_usd: t.Optional(t.String()),
        z3_price_usd: t.Optional(t.String()),
        z2_price_toman: t.Optional(t.Number()),
        z3_price_toman: t.Optional(t.Number()),
        z2_slots: t.Optional(t.Number()),
        z3_slots: t.Optional(t.Number()),
        active: t.Optional(t.Boolean()),
        cover_image: t.Optional(t.File({ format: "image/*" })),
      }),
    },
  )
  .delete("/admin/:id", async ({ params, status }) => {
    const deleted = await deleteGame(params.id);
    if (!deleted) return status(404, { message: "بازی مورد نظر یافت نشد" });
    return { message: "بازی حذف شد" };
  })
  .get("/admin/exchange-rate", async () => {
    const rate = await getExchangeRate();
    return rate ?? { usd_to_toman: null };
  })
  .post(
    "/admin/exchange-rate",
    async ({ body }) => {
      const rate = await setExchangeRate(body.usd_to_toman);
      return rate;
    },
    { body: t.Object({ usd_to_toman: t.Number({ minimum: 1 }) }) },
  );
