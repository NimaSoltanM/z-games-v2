import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { FileText, Send } from "lucide-react"

import { DashboardHeader } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  createSupportTicket,
  SUPPORT_CATEGORY_LABELS,
} from "@/features/support"
import type { SupportCategory } from "@/features/support"

const CATEGORIES = Object.entries(SUPPORT_CATEGORY_LABELS) as [
  SupportCategory,
  string,
][]

export const Route = createFileRoute("/dashboard/support/new")({
  validateSearch: (search: Record<string, unknown>) => ({
    order:
      typeof search.order === "string" && search.order.trim()
        ? search.order.trim().slice(0, 32)
        : undefined,
  }),
  component: NewSupportTicketPage,
})

function NewSupportTicketPage() {
  const { order } = Route.useSearch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [subject, setSubject] = useState(order ? `پیگیری سفارش ${order}` : "")
  const [category, setCategory] = useState<SupportCategory>("order")
  const [body, setBody] = useState(
    order ? `شماره سفارش: ${order}\n\nشرح درخواست:\n` : ""
  )
  const [error, setError] = useState("")

  const create = useMutation({
    mutationFn: createSupportTicket,
    onSuccess: async ({ id }) => {
      await queryClient.invalidateQueries({
        queryKey: ["support", "mine", "list"],
      })
      navigate({ to: "/dashboard/support/$id", params: { id } })
    },
    onError: (err) =>
      setError(err instanceof Error ? err.message : "ثبت درخواست انجام نشد"),
  })

  const valid =
    subject.trim().length > 0 &&
    subject.trim().length <= 160 &&
    body.trim().length > 0 &&
    body.trim().length <= 4000

  return (
    <>
      <DashboardHeader
        title="درخواست پشتیبانی جدید"
        description="موضوع را دقیق بنویسید تا درخواست سریع‌تر به بخش مرتبط برسد."
        back={{
          to: "/dashboard/support",
          search: { page: 1 },
          label: "پشتیبانی",
        }}
      />
      <form
        className="mx-auto max-w-2xl space-y-6 rounded-2xl border border-border/60 bg-card/75 p-5 backdrop-blur-sm sm:p-6"
        onSubmit={(event) => {
          event.preventDefault()
          if (!valid) return
          setError("")
          create.mutate({
            subject: subject.trim(),
            category,
            body: body.trim(),
          })
        }}
      >
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="size-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold">شرح درخواست</p>
            <p className="text-xs text-muted-foreground">
              هر درخواست برای یک موضوع مشخص ثبت می‌شود.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="support-subject">عنوان درخواست</Label>
          <Input
            id="support-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={160}
            placeholder="مثلاً: کد ورود سفارش دریافت نمی‌شود"
            disabled={create.isPending}
          />
          <p className="text-left text-xs text-muted-foreground tabular-nums">
            {subject.length.toLocaleString("fa-IR")} / ۱۶۰
          </p>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">موضوع</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(([value, label]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={category === value ? "default" : "outline"}
                onClick={() => setCategory(value)}
                disabled={create.isPending}
                className={cn(category === value && "font-semibold")}
              >
                {label}
              </Button>
            ))}
          </div>
        </fieldset>
        <div className="space-y-2">
          <Label htmlFor="support-body">توضیحات</Label>
          <Textarea
            id="support-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
            rows={8}
            placeholder="جزئیات مشکل، زمان رخ‌دادن و شماره سفارش مرتبط را بنویسید…"
            disabled={create.isPending}
          />
          <p className="text-left text-xs text-muted-foreground tabular-nums">
            {body.length.toLocaleString("fa-IR")} / ۴۰۰۰
          </p>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end">
          <Button type="submit" disabled={!valid || create.isPending}>
            <Send className="size-4" />
            {create.isPending ? "در حال ثبت…" : "ثبت درخواست"}
          </Button>
        </div>
      </form>
    </>
  )
}
