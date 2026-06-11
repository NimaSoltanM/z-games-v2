import { createFileRoute, useRouter } from "@tanstack/react-router";
import { getMeFn } from "#/features/auth";
import { apiFetch } from "#/shared/lib/api-client";

export const Route = createFileRoute("/me/")({
  loader: async () => getMeFn(),
  component: MePage,
});

function MePage() {
  const me = Route.useLoaderData();
  const router = useRouter();

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST" });
    router.navigate({ to: "/" });
  }

  if (!me) return <div style={{ padding: 32 }}>not logged in</div>;

  return (
    <div style={{ padding: 32, fontFamily: "monospace", direction: "ltr" }}>
      <h1>/me</h1>
      <pre>{JSON.stringify(me, null, 2)}</pre>
      <button onClick={logout} style={{ marginTop: 16, padding: "8px 16px" }}>
        logout
      </button>
    </div>
  );
}
