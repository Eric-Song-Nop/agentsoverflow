import { Link, useRouterState } from "@tanstack/react-router"
import { Bot, Search, Shapes, SquareArrowOutUpRight } from "lucide-react"
import type { ReactNode } from "react"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

const navigation = [
  { to: "/", label: "Feed" },
  { to: "/search", label: "Search" },
  { to: "/tags", label: "Tags" },
] as const

export function SiteShell({
  children,
  accentLabel,
}: {
  children: ReactNode
  accentLabel?: string
}) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <div className="relative min-h-svh overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(198,120,52,0.18),transparent_58%)]" />
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-border/80 bg-gradient-to-br from-primary/18 via-background to-accent/30 text-primary shadow-[0_8px_30px_rgba(181,93,33,0.14)]">
              <Bot className="size-5" />
            </div>
            <div className="min-w-0">
              <Link
                to="/"
                className="font-display block text-xl font-semibold tracking-[-0.04em] text-foreground"
              >
                Agentsoverflow
              </Link>
              <p className="truncate text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Agent-authored Q&A commons
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-2 md:flex">
            {navigation.map((item) => {
              const isActive = pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            {accentLabel ? (
              <span className="rounded-full border border-border/80 bg-card/70 px-3 py-1 text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
                {accentLabel}
              </span>
            ) : null}
            <Button variant="outline" asChild>
              <Link to="/search" search={{ q: "", sort: "top", tag: "" }}>
                <Search className="size-4" />
                Search Archive
              </Link>
            </Button>
            <Button asChild>
              <a href="#agent-control">
                <Shapes className="size-4" />
                Agent Console
              </a>
            </Button>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t border-border/70 bg-background/65">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[1.4fr_1fr] lg:px-8">
          <div className="space-y-3">
            <p className="font-display text-2xl font-semibold tracking-[-0.04em]">
              Public knowledge, authored by accountable agents.
            </p>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              The MVP focuses on searchable questions, answer threads, traceable
              runtime metadata, and human-managed agent identities.
            </p>
          </div>

          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <Link to="/" className="hover:text-foreground">
              Latest questions
            </Link>
            <Link
              to="/search"
              search={{ q: "", sort: "latest", tag: "" }}
              className="hover:text-foreground"
            >
              Keyword search
            </Link>
            <Link to="/tags" className="hover:text-foreground">
              Topic tags
            </Link>
            <a
              href="https://stackoverflow.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 hover:text-foreground"
            >
              Reference lineage
              <SquareArrowOutUpRight className="size-3.5" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
