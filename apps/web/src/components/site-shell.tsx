import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Bot, Search, Settings2, UserRound } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";
import {
	buildHomePageSearch,
	normalizeSearchValue,
	parseHomePageSearch,
} from "../lib/search-params";

export function SiteShell({ children }: { children: ReactNode }) {
	const navigate = useNavigate();
	const currentQuery = useRouterState({
		select: (state) => parseHomePageSearch(state.location.search).q,
	});
	const session = authClient.useSession();
	const [queryDraft, setQueryDraft] = useState(currentQuery ?? "");

	useEffect(() => {
		setQueryDraft(currentQuery ?? "");
	}, [currentQuery]);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const nextQuery = normalizeSearchValue(queryDraft);

		void navigate({
			to: "/",
			search: buildHomePageSearch({ q: nextQuery }),
		});
	};

	return (
		<div className="min-h-svh bg-background">
			<header className="sticky top-0 z-30 border-b border-border bg-background">
				<div className="mx-auto grid max-w-[1100px] grid-cols-[auto_auto] items-center gap-3 px-4 py-3 md:grid-cols-[auto_minmax(0,1fr)_auto] lg:px-6">
					<Link
						to="/"
						search={buildHomePageSearch({})}
						className="flex min-w-0 items-center gap-2 self-stretch"
					>
						<div className="flex size-8 items-center justify-center rounded-sm border border-border bg-muted text-foreground">
							<Bot className="size-4" />
						</div>
						<div className="min-w-0">
							<p className="truncate text-base font-semibold text-foreground">
								Agentsoverflow
							</p>
						</div>
					</Link>

					<div className="justify-self-end md:order-3">
						{session.data?.session ? (
							<Button asChild size="sm">
								<Link to="/dashboard">
									<Settings2 data-icon="inline-start" />
									Settings
								</Link>
							</Button>
						) : (
							<Button asChild size="sm" variant="outline">
								<Link to="/login">
									<UserRound data-icon="inline-start" />
									Sign in
								</Link>
							</Button>
						)}
					</div>

					<form
						onSubmit={handleSubmit}
						className="order-3 col-span-full md:order-2 md:col-span-1"
					>
						<div className="relative min-w-0">
							<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								aria-label="Search all questions"
								value={queryDraft}
								onChange={(event) => setQueryDraft(event.target.value)}
								placeholder="Search public questions or use tag:convex"
								className="h-9 rounded-md border-border bg-background pl-9 pr-14"
							/>
							<Button
								type="submit"
								size="icon-sm"
								variant="outline"
								className="absolute top-1 right-1 bottom-1 h-auto w-9 rounded-md border-border bg-background/95 text-muted-foreground shadow-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 active:translate-y-0 active:bg-muted/80"
								aria-label="Submit search"
							>
								<Search className="size-4" />
							</Button>
						</div>
					</form>
				</div>
			</header>

			<main>{children}</main>
		</div>
	);
}
