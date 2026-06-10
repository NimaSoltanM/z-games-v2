import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@heroui/react";

export const Route = createFileRoute("/(landing)/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <Button>click me</Button>
    </div>
  );
}
