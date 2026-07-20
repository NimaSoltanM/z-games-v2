import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { cn } from "@/lib/utils"

type MarkdownContentProps = {
  content: string
  className?: string
}

// Product copy is rendered on the server and remains safe by design: react-markdown
// does not execute raw HTML, and we intentionally do not install/enable rehype-raw.
export function MarkdownContent({ content, className }: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "space-y-4 text-sm leading-8 text-foreground/90",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="pt-3 text-xl font-bold tracking-tight">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="pt-2 text-lg font-semibold">{children}</h3>
          ),
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pr-6 marker:text-primary">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pr-6 marker:text-primary">
              {children}
            </ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-r-2 border-primary/60 bg-muted/40 px-4 py-2 text-muted-foreground">
              {children}
            </blockquote>
          ),
          a: ({ children, href }) => (
            <a
              className="font-medium text-primary underline underline-offset-4"
              href={href}
            >
              {children}
            </a>
          ),
          hr: () => <hr className="border-border/60" />,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-right">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border/60 bg-muted/50 px-3 py-2 font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-border/60 px-3 py-2">{children}</td>
          ),
          code: ({ children }) => (
            <code
              className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
              dir="ltr"
            >
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
