import { createFileRoute, redirect } from "@tanstack/react-router";
import { getMeFn } from "#/features/auth";
import { AuthForm } from "#/features/auth/components/AuthForm";

export const Route = createFileRoute("/(auth)/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    callbackUrl:
      typeof search.callbackUrl === "string" &&
      search.callbackUrl.startsWith("/") &&
      !search.callbackUrl.startsWith("//")
        ? search.callbackUrl
        : "/",
  }),
  beforeLoad: async ({ search }) => {
    const me = await getMeFn();
    if (me) throw redirect({ to: search.callbackUrl as never });
  },
  component: AuthPage,
});

function AuthPage() {
  const { callbackUrl } = Route.useSearch();
  return <AuthForm callbackUrl={callbackUrl} />;
}
