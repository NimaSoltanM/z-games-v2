import { createFileRoute, ErrorComponent, Link } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import {
  useSuspenseQuery,
  useQueryErrorResetBoundary,
  useQueryClient,
} from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
  adminGamesQueryOptions,
  adminExchangeRateQueryOptions,
  deleteGame,
  setExchangeRate,
  PLATFORM_LABEL,
} from "#/features/games";

function AdminGamesError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />;
}

export const Route = createFileRoute("/admin/games/")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(adminGamesQueryOptions());
    context.queryClient.prefetchQuery(adminExchangeRateQueryOptions());
  },
  component: AdminGamesPage,
  errorComponent: AdminGamesError,
});

function AdminGamesPage() {
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
        <AdminGamesList />
      </Suspense>
    </ErrorBoundary>
  );
}

function AdminGamesList() {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery(adminGamesQueryOptions());
  const { data: rateData } = useSuspenseQuery(adminExchangeRateQueryOptions());
  const [rateInput, setRateInput] = useState(
    rateData?.usd_to_toman?.toString() ?? "",
  );

  async function handleDeleteGame(id: string, name: string) {
    if (!confirm(`حذف "${name}"؟`)) return;
    await deleteGame(id);
    qc.invalidateQueries({ queryKey: ["admin", "games"] });
  }

  async function handleSaveRate() {
    const val = parseInt(rateInput);
    if (!val || val < 1) return alert("نرخ معتبر وارد کنید");
    await setExchangeRate(val);
    qc.invalidateQueries({ queryKey: ["admin", "exchange-rate"] });
    alert("نرخ ذخیره شد");
  }

  const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

  return (
    <div className="p-8" style={{ direction: "rtl" }}>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">مدیریت بازی‌ها</h1>
        <Link
          to="/admin/games/new"
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm">
          + بازی جدید
        </Link>
      </div>

      {/* Exchange rate */}
      <div className="mb-8 p-4 border border-default-200 rounded-xl max-w-sm">
        <p className="font-semibold mb-2">نرخ دلار (تومان)</p>
        <div className="flex gap-2">
          <input
            type="number"
            value={rateInput}
            onChange={(e) => setRateInput(e.target.value)}
            className="border border-default-200 rounded-lg px-3 py-2 flex-1 text-sm"
            placeholder="مثال: 95000"
          />
          <button
            onClick={handleSaveRate}
            className="px-4 py-2 bg-default-800 text-white rounded-lg text-sm">
            ذخیره
          </button>
        </div>
      </div>

      {/* Games table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-default-200 text-right">
              <th className="py-2 px-3">تصویر</th>
              <th className="py-2 px-3">نام</th>
              <th className="py-2 px-3">پلتفرم</th>
              <th className="py-2 px-3">وضعیت</th>
              <th className="py-2 px-3">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {data.games.map((game) => (
              <tr key={game.id} className="border-b border-default-100">
                <td className="py-2 px-3">
                  {game.cover_image ? (
                    <img
                      src={`${API_URL}${game.cover_image}`}
                      alt={game.name}
                      className="w-10 h-14 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-14 bg-default-100 rounded" />
                  )}
                </td>
                <td className="py-2 px-3 font-medium">{game.name}</td>
                <td className="py-2 px-3 text-default-400">
                  {PLATFORM_LABEL[game.platform]}
                </td>
                <td className="py-2 px-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs ${
                      game.active
                        ? "bg-success/20 text-success"
                        : "bg-default-200 text-default-500"
                    }`}>
                    {game.active ? "فعال" : "غیرفعال"}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <div className="flex gap-2">
                    <Link
                      to="/admin/games/$id/edit"
                      params={{ id: game.id }}
                      className="text-primary text-xs">
                      ویرایش
                    </Link>
                    <button
                      onClick={() => handleDeleteGame(game.id, game.name)}
                      className="text-danger text-xs">
                      حذف
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.games.length === 0 && (
          <p className="text-center py-8 text-default-400">هیچ بازی‌ای ثبت نشده</p>
        )}
      </div>
    </div>
  );
}
