import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/(landing)")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <h1>layout</h1>
      <Outlet />
    </div>
  );
}
