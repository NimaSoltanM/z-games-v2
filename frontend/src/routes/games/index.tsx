import { createFileRoute, Link, ErrorComponent } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { gamesQueryOptions, calcPrice, formatToman, PLATFORM_LABEL } from "#/features/games";

function GamesError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />;
}

export const Route = createFileRoute("/games/")({
  loader: ({ context }) => context.queryClient.prefetchQuery(gamesQueryOptions()),
  component: GamesPage,
  errorComponent: GamesError,
});

function GamesPage() {
  const { reset } = useQueryErrorResetBoundary();
  return (
    <ErrorBoundary
      onReset={reset}
      fallbackRender={({ resetErrorBoundary }) => (
        <div className="p-8">
          <p>خطایی رخ داد</p>
          <button onClick={resetErrorBoundary}>تلاش مجدد</button>
        </div>
      )}>
      <Suspense fallback={<div className="p-8">در حال بارگذاری...</div>}>
        <GamesList />
      </Suspense>
    </ErrorBoundary>
  );
}

function GamesList() {
  const { data } = useSuspenseQuery(gamesQueryOptions());
  const { games, exchange_rate } = data;

  if (games.length === 0) {
    return <div className="p-8 text-center">هیچ بازی‌ای موجود نیست</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">بازی‌ها</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {games.map((game) => {
          const z2 = calcPrice(game, "z2", exchange_rate);
          const z3 = calcPrice(game, "z3", exchange_rate);
          return (
            <Link key={game.id} to="/games/$id" params={{ id: game.id }}>
              <div className="rounded-xl overflow-hidden border border-default-200 hover:border-primary transition-colors">
                {game.cover_image ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL ?? "http://localhost:3001"}${game.cover_image}`}
                    alt={game.name}
                    className="w-full aspect-[3/4] object-cover"
                  />
                ) : (
                  <div className="w-full aspect-[3/4] bg-default-100 flex items-center justify-center text-default-400">
                    بدون تصویر
                  </div>
                )}
                <div className="p-3">
                  <p className="font-semibold text-sm truncate">{game.name}</p>
                  <p className="text-xs text-default-400 mt-1">{PLATFORM_LABEL[game.platform]}</p>
                  <div className="mt-2 space-y-1">
                    {z2 !== null && (
                      <p className="text-xs">ظرفیت ۲: {formatToman(z2)}</p>
                    )}
                    {z3 !== null && (
                      <p className="text-xs">ظرفیت ۳: {formatToman(z3)}</p>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
