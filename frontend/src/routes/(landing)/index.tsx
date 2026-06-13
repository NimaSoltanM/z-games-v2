import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/(landing)/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center gap-6">
      <h1 className="text-4xl font-bold">بازی‌های PS4 و PS5</h1>
      <p className="text-default-500 max-w-md">
        با قیمت مناسب، بازی مورد نظرت رو روی کنسولت داشته باش.
      </p>
      <Link
        to="/games"
        search={{ page: 1, platform: "", price_mode: "", search: "", sort: "-created_at" }}
        className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
        مشاهده بازی‌ها
      </Link>
    </div>
  );
}
