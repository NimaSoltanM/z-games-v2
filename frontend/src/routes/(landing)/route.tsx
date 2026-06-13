import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { getMeFn } from "#/features/auth";

export const Route = createFileRoute("/(landing)")({
  loader: async () => getMeFn(),
  component: LandingLayout,
});

function LandingLayout() {
  const me = Route.useLoaderData();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-default-200 px-6 py-4 flex items-center justify-between">
        <Link to="/" className="font-bold text-lg">Z-Games</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/games" search={{ page: 1, platform: "", price_mode: "", search: "", sort: "-created_at" }} className="text-default-500 hover:text-foreground transition-colors">بازی‌ها</Link>
          {me ? (
            <>
              {(me.role === "admin" || me.role === "super_admin") && (
                <Link to="/admin/games" className="text-default-500 hover:text-foreground transition-colors">پنل ادمین</Link>
              )}
              <Link to="/me" className="text-default-500 hover:text-foreground transition-colors">
                {me.firstName ?? me.phone}
              </Link>
            </>
          ) : (
            <Link to="/auth" search={{ callbackUrl: "/" }} className="text-default-500 hover:text-foreground transition-colors">ورود</Link>
          )}
        </nav>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
