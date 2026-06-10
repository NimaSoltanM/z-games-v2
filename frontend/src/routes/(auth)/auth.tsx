import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth)/auth")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/(auth)/auth"!</div>;
}
