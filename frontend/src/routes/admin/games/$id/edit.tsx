import { createFileRoute, useRouter, ErrorComponent } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useState, Suspense } from "react";
import { useSuspenseQuery, useQueryClient, useQueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { GameForm } from "#/features/games/components/GameForm";
import { adminGamesQueryOptions, updateGame } from "#/features/games";

function EditGameError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />;
}

export const Route = createFileRoute("/admin/games/$id/edit")({
  loader: ({ context }) => context.queryClient.prefetchQuery(adminGamesQueryOptions()),
  component: EditGamePage,
  errorComponent: EditGameError,
});

function EditGamePage() {
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
        <EditGameForm />
      </Suspense>
    </ErrorBoundary>
  );
}

function EditGameForm() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(adminGamesQueryOptions());
  const game = data.games.find((g) => g.id === id);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();

  if (!game) return <div className="p-8">بازی یافت نشد</div>;

  async function handleSubmit(form: FormData) {
    setSubmitting(true);
    try {
      await updateGame(id, form);
      qc.invalidateQueries({ queryKey: ["admin", "games"] });
      router.navigate({ to: "/admin/games" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">ویرایش: {game.name}</h1>
      <GameForm initial={game} onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}
