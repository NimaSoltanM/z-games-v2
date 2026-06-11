import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GameForm } from "#/features/games/components/GameForm";
import { createGame } from "#/features/games";

export const Route = createFileRoute("/admin/games/new")({
  component: NewGamePage,
});

function NewGamePage() {
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();

  async function handleSubmit(form: FormData) {
    setSubmitting(true);
    try {
      await createGame(form);
      qc.invalidateQueries({ queryKey: ["admin", "games"] });
      router.navigate({ to: "/admin/games" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">بازی جدید</h1>
      <GameForm onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}
