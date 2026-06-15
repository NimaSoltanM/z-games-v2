import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useSelector } from "@tanstack/react-store"

import { meQueryOptions } from "@/features/auth"
import type { ConsolePlatform, Zarfiat } from "@/features/games"

import {
  addServerCartItem,
  clearServerCart,
  removeServerCartItem,
  updateServerCartItem,
} from "./api"
import type { ServerCartItem } from "./api"
import { serverCartQueryOptions, SERVER_CART_KEY } from "./queries"
import { addToCart, cartStore, clearCart, removeFromCart, setQuantity } from "./store"
import type { CartItem } from "./types"

const MAX_QTY = 10
const CART_MUT_KEY = ["cart", "mutate"] as const

type ServerCache = { items: ServerCartItem[] }

function toLine(i: ServerCartItem): CartItem {
  return {
    gameId: i.game_id,
    gameName: i.game_name,
    coverImage: i.cover_image,
    platform: i.platform,
    zarfiat: i.zarfiat,
    quantity: i.quantity,
  }
}

function sameLine(i: ServerCartItem, gameId: string, platform: ConsolePlatform, zarfiat: Zarfiat) {
  return i.game_id === gameId && i.platform === platform && i.zarfiat === zarfiat
}

export type AddInput = Omit<CartItem, "quantity">

export function useCart() {
  const queryClient = useQueryClient()
  const { data: me } = useQuery(meQueryOptions())
  const isLoggedIn = !!me

  const serverCart = useQuery({
    ...serverCartQueryOptions(),
    enabled: isLoggedIn,
  })

  // Anonymous cart is always subscribed (cheap); ignored when logged in.
  const anonItems = useSelector(cartStore, (s) => s.items)

  const items: CartItem[] = isLoggedIn
    ? (serverCart.data?.items ?? []).map(toLine)
    : anonItems

  // --- optimistic plumbing for the server cart ---------------------------------

  function patchCache(updater: (items: ServerCartItem[]) => ServerCartItem[]) {
    queryClient.setQueryData<ServerCache>(SERVER_CART_KEY, (old) => ({
      items: updater(old?.items ?? []),
    }))
  }

  async function beginOptimistic(updater: (items: ServerCartItem[]) => ServerCartItem[]) {
    await queryClient.cancelQueries({ queryKey: SERVER_CART_KEY })
    const prev = queryClient.getQueryData<ServerCache>(SERVER_CART_KEY)
    patchCache(updater)
    return { prev }
  }

  function rollback(ctx: { prev?: ServerCache } | undefined) {
    if (ctx?.prev) queryClient.setQueryData(SERVER_CART_KEY, ctx.prev)
  }

  // Only refetch once the last cart mutation settles, so rapid clicks don't
  // race a stale refetch over a newer optimistic value.
  function reconcile() {
    if (queryClient.isMutating({ mutationKey: CART_MUT_KEY }) <= 1) {
      queryClient.invalidateQueries({ queryKey: SERVER_CART_KEY })
    }
  }

  const addMutation = useMutation({
    mutationKey: CART_MUT_KEY,
    mutationFn: (v: AddInput) =>
      addServerCartItem({ game_id: v.gameId, platform: v.platform, zarfiat: v.zarfiat, quantity: 1 }),
    onMutate: (v) =>
      beginOptimistic((list) => {
        const idx = list.findIndex((i) => sameLine(i, v.gameId, v.platform, v.zarfiat))
        if (idx >= 0) {
          const next = list.slice()
          next[idx] = { ...next[idx], quantity: Math.min(next[idx].quantity + 1, MAX_QTY) }
          return next
        }
        return [
          ...list,
          {
            id: `optimistic:${v.gameId}:${v.platform}:${v.zarfiat}`,
            game_id: v.gameId,
            game_name: v.gameName,
            cover_image: v.coverImage,
            platform: v.platform,
            zarfiat: v.zarfiat,
            quantity: 1,
          },
        ]
      }),
    onError: (_e, _v, ctx) => rollback(ctx),
    onSettled: reconcile,
  })

  const updateMutation = useMutation({
    mutationKey: CART_MUT_KEY,
    mutationFn: (v: { gameId: string; platform: ConsolePlatform; zarfiat: Zarfiat; quantity: number }) =>
      updateServerCartItem({ game_id: v.gameId, platform: v.platform, zarfiat: v.zarfiat, quantity: v.quantity }),
    onMutate: (v) =>
      beginOptimistic((list) => {
        if (v.quantity <= 0) {
          return list.filter((i) => !sameLine(i, v.gameId, v.platform, v.zarfiat))
        }
        return list.map((i) =>
          sameLine(i, v.gameId, v.platform, v.zarfiat)
            ? { ...i, quantity: Math.min(v.quantity, MAX_QTY) }
            : i,
        )
      }),
    onError: (_e, _v, ctx) => rollback(ctx),
    onSettled: reconcile,
  })

  const removeMutation = useMutation({
    mutationKey: CART_MUT_KEY,
    mutationFn: (v: { gameId: string; platform: ConsolePlatform; zarfiat: Zarfiat }) =>
      removeServerCartItem({ game_id: v.gameId, platform: v.platform, zarfiat: v.zarfiat }),
    onMutate: (v) =>
      beginOptimistic((list) => list.filter((i) => !sameLine(i, v.gameId, v.platform, v.zarfiat))),
    onError: (_e, _v, ctx) => rollback(ctx),
    onSettled: reconcile,
  })

  const clearMutation = useMutation({
    mutationKey: CART_MUT_KEY,
    mutationFn: () => clearServerCart(),
    onMutate: () => beginOptimistic(() => []),
    onError: (_e, _v, ctx) => rollback(ctx),
    onSettled: reconcile,
  })

  // --- unified actions ---------------------------------------------------------

  function addItem(input: AddInput) {
    if (isLoggedIn) addMutation.mutate(input)
    else addToCart(input)
  }

  function setItemQty(gameId: string, platform: ConsolePlatform, zarfiat: Zarfiat, quantity: number) {
    if (isLoggedIn) updateMutation.mutate({ gameId, platform, zarfiat, quantity })
    else setQuantity(gameId, platform, zarfiat, quantity)
  }

  function removeItem(gameId: string, platform: ConsolePlatform, zarfiat: Zarfiat) {
    if (isLoggedIn) removeMutation.mutate({ gameId, platform, zarfiat })
    else removeFromCart(gameId, platform, zarfiat)
  }

  function clear() {
    if (isLoggedIn) clearMutation.mutate()
    else clearCart()
  }

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0)

  return {
    me,
    isLoggedIn,
    items,
    totalQuantity,
    // server cart is prefetched in the root loader, so this is only true on a
    // cold client fetch — used to show a skeleton instead of an empty cart flash.
    isLoading: isLoggedIn && serverCart.isLoading,
    addItem,
    setItemQty,
    removeItem,
    clear,
  }
}
