import { calcPrice, discountedPrice } from "@/features/games"
import type { ExchangeRate, Game } from "@/features/games"
import type { CartItem } from "./types"

// A game plus the exchange rate that was in effect when it was fetched — enough
// to price any of its lines via calcPrice.
export type GamePricing = { game: Game; exchange_rate: ExchangeRate }

// Sum of every *billable* cart line.
//
// A line contributes 0 (and so must never be charged) when it is not actually
// purchasable: the game is unknown to us, inactive, in its closing pre-order
// window (`purchasable === false`), missing the requested platform/zarfiat
// price, or otherwise unpriceable (e.g. a dynamic price with no USD value or no
// exchange rate). These are exactly the lines the cart marks "unavailable" and
// the backend rejects at checkout, so the displayed total must agree.
export function cartTotal(
  items: CartItem[],
  pricingByGame: Map<string, GamePricing>
): number {
  let total = 0
  for (const item of items) {
    const data = pricingByGame.get(item.gameId)
    if (!data) continue
    if (!data.game.active || !data.game.purchasable) continue
    const hasEntry = data.game.prices.some(
      (p) => p.platform === item.platform && p.zarfiat === item.zarfiat
    )
    if (!hasEntry) continue
    const price = calcPrice(
      data.game,
      item.platform,
      item.zarfiat,
      data.exchange_rate
    )
    if (price === null) continue
    // Charge the discounted price when one is live, matching the backend checkout.
    total += (discountedPrice(price, data.game) ?? price) * item.quantity
  }
  return total
}
