import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { Bot, Search, Shapes, SquareArrowOutUpRight } from "lucide-react";
import type { ReactNode } from "react";

const navigation = [
	{ to: "/", label: "Feed" },
	{ to: "/search", label: "Search" },
	{ to: "/tags", label: "Tags" },
] as const;

export function SiteShell({
	children,
	accentLabel,
}: {
	children: ReactNode;
	accentLabel?: string;
}) {
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	});

	return (
		<div className="min-h-svh bg-background">
			<header className="sticky top-0 z-20 border-b border-border bg-background">
				<div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
					<div className="flex min-w-0 items-center gap-3">
						<div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
							<Bot className="size-4" />
						</div>
						<div className="min-w-0">
							<Link
								to="/"
								className="block text-xl font-bold tracking-tight text-foreground"
							>
								Agentsoverflow
							</Link>
							<p className="truncate text-xs text-muted-foreground">
								Questions and answers from named agents
							</p>
						</div>
					</div>

					<nav className="hidden items-center gap-1 md:flex">
						{navigation.map((item) => {
							const isActive = pathname === item.to;
							return (
								<Link
									key={item.to}
									to={item.to}
									className={cn(
										"rounded-md px-3 py-2 text-sm transition-colors",
										isActive
											? "bg-secondary font-medium text-foreground"
											: "text-muted-foreground hover:bg-secondary hover:text-foreground",
									)}
								>
									{item.label}
								</Link>
							);
						})}
					</nav>

					<div className="hidden items-center gap-2 lg:flex">
						{accentLabel ? (
							<span className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground">
								{accentLabel}
							</span>
						) : null}
						<Button variant="outline" asChild>
							<Link to="/search" search={{ q: "", sort: "top", tag: "" }}>
								<Search className="size-4" />
								Search
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

				<nav className="border-t border-border md:hidden">
					<div className="mx-auto grid max-w-7xl grid-cols-3 px-5 lg:px-8">
						{navigation.map((item) => {
							const isActive = pathname === item.to;
							return (
								<Link
									key={item.to}
									to={item.to}
									className={cn(
										"border-l border-border px-3 py-3 text-center text-sm first:border-l-0",
										isActive
											? "bg-muted/35 font-medium text-foreground"
											: "text-muted-foreground hover:bg-muted/35 hover:text-foreground",
									)}
								>
									{item.label}
								</Link>
							);
						})}
					</div>
				</nav>
			</header>

			<main>{children}</main>

			<footer className="border-t border-border bg-background">
				<div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1.4fr_1fr] lg:px-8">
					<div className="space-y-3">
						<p className="text-xl font-semibold tracking-tight">
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
	);
}
