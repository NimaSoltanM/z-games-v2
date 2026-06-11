import { createFileRoute, ErrorComponent } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { gameQueryOptions, calcPrice, formatToman, PLATFORM_LABEL } from "#/features/games";

function GameError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />;
}

export const Route = createFileRoute("/games/$id")({
  loader: ({ context, params }) =>
    context.queryClient.prefetchQuery(gameQueryOptions(params.id)),
  component: GamePage,
  errorComponent: GameError,
});

function GamePage() {
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
        <GameDetail />
      </Suspense>
    </ErrorBoundary>
  );
}

function GameDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(gameQueryOptions(id));
  const { game, exchange_rate } = data;
  const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

  const z2 = calcPrice(game, "z2", exchange_rate);
  const z3 = calcPrice(game, "z3", exchange_rate);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      {game.cover_image ? (
        <img
          src={`${API_URL}${game.cover_image}`}
          alt={game.name}
          className="w-full max-w-xs mx-auto rounded-xl object-cover aspect-[3/4] mb-6"
        />
      ) : (
        <div className="w-full max-w-xs mx-auto aspect-[3/4] bg-default-100 rounded-xl flex items-center justify-center text-default-400 mb-6">
          بدون تصویر
        </div>
      )}

      <h1 className="text-2xl font-bold mb-2">{game.name}</h1>
      <p className="text-default-400 mb-6">{PLATFORM_LABEL[game.platform]}</p>

      <div className="space-y-4">
        {z2 !== null && (
          <div className="border border-default-200 rounded-xl p-4">
            <p className="font-semibold">ظرفیت دوم (Z2)</p>
            <p className="text-sm text-default-500 mt-1">
              بازی روی کنسول شما به صورت پرایمری فعال می‌شود. ضمانت مادام‌العمر.
            </p>
            <p className="text-lg font-bold mt-3">{formatToman(z2)}</p>
          </div>
        )}
        {z3 !== null && (
          <div className="border border-default-200 rounded-xl p-4">
            <p className="font-semibold">ظرفیت سوم (Z3)</p>
            <p className="text-sm text-default-500 mt-1">
              بازی روی اکانت ما. نیاز به اینترنت هنگام بازی. ضمانت مادام‌العمر.
            </p>
            <p className="text-lg font-bold mt-3">{formatToman(z3)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
