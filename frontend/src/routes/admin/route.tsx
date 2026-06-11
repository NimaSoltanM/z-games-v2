import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { getMeFn } from "#/features/auth";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const me = await getMeFn();
    if (!me || me.role === "user") throw redirect({ to: "/" });
  },
  component: () => <Outlet />,
});
