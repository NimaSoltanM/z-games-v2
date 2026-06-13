import { createFileRoute, Link, ErrorComponent, useNavigate } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, useState, useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Card, Chip, Skeleton, Pagination, SearchField, Select, Label, ListBox } from "@heroui/react";
import { gamesQueryOptions, calcPrice, formatToman, PLATFORM_LABEL } from "#/features/games";

const SORT_OPTIONS = [
  { id: "-created_at", label: "جدیدترین" },
  { id: "created_at", label: "قدیمی‌ترین" },
  { id: "name", label: "نام (A-Z)" },
  { id: "-name", label: "نام (Z-A)" },
] as const;

function GamesError({ error }: ErrorComponentProps) {
  return <ErrorComponent error={error} />;
}

export const Route = createFileRoute("/games/")({
  validateSearch: (search: Record<string, unknown>) => ({
    page: Math.max(1, Number(search.page) || 1),
    platform: String(search.platform || ""),
    price_mode: String(search.price_mode || ""),
    search: String(search.search || ""),
    sort: String(search.sort || "-created_at"),
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    context.queryClient.prefetchQuery(gamesQueryOptions(deps)),
  component: GamesPage,
  errorComponent: GamesError,
});

function GamesPage() {
  const { reset } = useQueryErrorResetBoundary();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/games/" });
  const [searchInput, setSearchInput] = useState(search.search);

  useEffect(() => {
    setSearchInput(search.search);
  }, [search.search]);

  useEffect(() => {
    if (searchInput === search.search) return;
    const timer = setTimeout(() => {
      navigate({ search: (prev) => ({ ...prev, search: searchInput, page: 1 }) });
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  function setFilter(key: "platform" | "price_mode" | "sort", value: string) {
    navigate({ search: (prev) => ({ ...prev, [key]: value, page: 1 }) });
  }

  return (
    <div dir="rtl" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">بازی‌ها</h1>
        <p className="text-sm text-muted mt-1">بازی مورد نظرت رو پیدا کن</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <SearchField
          fullWidth
          className="flex-1 min-w-[180px] max-w-sm"
          value={searchInput}
          onChange={setSearchInput}
          onClear={() => {
            setSearchInput("");
            navigate({ search: (prev) => ({ ...prev, search: "", page: 1 }) });
          }}
          aria-label="جستجوی بازی"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="جستجوی بازی..." />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>

        <Select
          className="w-[155px]"
          placeholder="همه پلتفرم‌ها"
          value={search.platform || "all"}
          onChange={(val) =>
            setFilter("platform", val === "all" || !val ? "" : String(val))
          }
        >
          <Label>پلتفرم</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="all">همه پلتفرم‌ها</ListBox.Item>
              <ListBox.Item id="ps4">PS4</ListBox.Item>
              <ListBox.Item id="ps5">PS5</ListBox.Item>
              <ListBox.Item id="ps4_ps5">PS4 & PS5</ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>

        <Select
          className="w-[155px]"
          placeholder="همه"
          value={search.price_mode || "all"}
          onChange={(val) =>
            setFilter("price_mode", val === "all" || !val ? "" : String(val))
          }
        >
          <Label>نوع قیمت</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id="all">همه</ListBox.Item>
              <ListBox.Item id="dynamic">پویا (دلاری)</ListBox.Item>
              <ListBox.Item id="fixed">ثابت (تومانی)</ListBox.Item>
            </ListBox>
          </Select.Popover>
        </Select>

        <Select
          className="w-[155px]"
          value={search.sort}
          onChange={(val) => setFilter("sort", val ? String(val) : "-created_at")}
        >
          <Label>ترتیب</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {SORT_OPTIONS.map((opt) => (
                <ListBox.Item key={opt.id} id={opt.id}>
                  {opt.label}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      {/* Grid + Pagination */}
      <ErrorBoundary
        onReset={reset}
        fallbackRender={({ resetErrorBoundary }) => (
          <div className="text-center py-16">
            <p className="mb-4">خطایی رخ داد</p>
            <button
              onClick={resetErrorBoundary}
              className="text-primary underline text-sm"
            >
              تلاش مجدد
            </button>
          </div>
        )}
      >
        <Suspense fallback={<GamesGridSkeleton />}>
          <GamesContent />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

function GamesContent() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/games/" });
  const { data } = useSuspenseQuery(gamesQueryOptions(search));
  const { games, exchange_rate, pagination } = data;
  const { page, total, total_pages, limit } = pagination;

  if (games.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-lg font-medium">هیچ بازی‌ای یافت نشد</p>
        <p className="text-sm text-muted mt-2">فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید</p>
      </div>
    );
  }

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {games.map((game) => {
          const z2 = calcPrice(game, "z2", exchange_rate);
          const z3 = calcPrice(game, "z3", exchange_rate);
          return (
            <Link key={game.id} to="/games/$id" params={{ id: game.id }}>
              <Card className="overflow-hidden p-0 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
                {game.cover_image ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL ?? "http://localhost:3002"}${game.cover_image}`}
                    alt={game.name}
                    className="w-full aspect-[3/4] object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full aspect-[3/4] bg-gradient-to-br from-surface-secondary to-surface-tertiary flex items-end p-3">
                    <span className="text-sm font-medium line-clamp-3 text-right w-full">
                      {game.name}
                    </span>
                  </div>
                )}
                <div className="p-3 space-y-2">
                  <p className="font-semibold text-sm line-clamp-2 leading-snug">
                    {game.name}
                  </p>
                  <Chip size="sm" variant="soft" color="accent">
                    {PLATFORM_LABEL[game.platform]}
                  </Chip>
                  {(z2 !== null || z3 !== null) && (
                    <div className="space-y-0.5 text-xs text-muted">
                      {z2 !== null && <p>ظ۲: {formatToman(z2)}</p>}
                      {z3 !== null && <p>ظ۳: {formatToman(z3)}</p>}
                    </div>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {total_pages > 1 && (
        <div className="flex flex-col items-center gap-3">
          <Pagination>
            <Pagination.Summary>
              نمایش {from}–{to} از {total} بازی
            </Pagination.Summary>
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous
                  isDisabled={page === 1}
                  onPress={() =>
                    navigate({ search: (prev) => ({ ...prev, page: page - 1 }) })
                  }
                >
                  <Pagination.PreviousIcon />
                </Pagination.Previous>
              </Pagination.Item>

              {getPages(page, total_pages).map((p, i) =>
                p === "ellipsis" ? (
                  <Pagination.Item key={`e-${i}`}>
                    <Pagination.Ellipsis />
                  </Pagination.Item>
                ) : (
                  <Pagination.Item key={p}>
                    <Pagination.Link
                      isActive={p === page}
                      onPress={() =>
                        navigate({ search: (prev) => ({ ...prev, page: p }) })
                      }
                    >
                      {p}
                    </Pagination.Link>
                  </Pagination.Item>
                )
              )}

              <Pagination.Item>
                <Pagination.Next
                  isDisabled={page === total_pages}
                  onPress={() =>
                    navigate({ search: (prev) => ({ ...prev, page: page + 1 }) })
                  }
                >
                  <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
        </div>
      )}
    </div>
  );
}

function GamesGridSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden">
            <Skeleton className="aspect-[3/4] w-full rounded-none" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4 rounded" />
              <Skeleton className="h-5 w-1/3 rounded-full" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getPages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 1) return [1];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);

  return pages;
}
