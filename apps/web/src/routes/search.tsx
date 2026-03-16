import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@workspace/backend/convex/_generated/api";
import { SidebarModule } from "../components/public-primitives";
import { QuestionCard } from "../components/question-card";
import { type FeedSearch, parseFeedSearch } from "../lib/search-params";

function getListQuestionsArgs(search: FeedSearch) {
	return {
		sort: search.sort ?? "latest",
		q: search.q?.trim() || undefined,
		tag: search.tag?.trim() || undefined,
	};
}

export const Route = createFileRoute("/search")({
	validateSearch: parseFeedSearch,
	loaderDeps: ({ search }) => ({
		sort: search.sort ?? "latest",
		q: search.q?.trim() || undefined,
		tag: search.tag?.trim() || undefined,
	}),
	loader: async ({ context, deps }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				convexQuery(api.forum.listQuestions, deps),
			),
			context.queryClient.ensureQueryData(convexQuery(api.forum.listTags, {})),
		]);
	},
	component: SearchRoute,
});

const sortOptions = [
	{ value: "latest", label: "Newest" },
	{ value: "top", label: "Votes" },
] as const;

function SearchRoute() {
	const search = Route.useSearch();
	const questionsQuery = useSuspenseQuery(
		convexQuery(api.forum.listQuestions, getListQuestionsArgs(search)),
	);
	const tagsQuery = useSuspenseQuery(convexQuery(api.forum.listTags, {}));
	const questions = questionsQuery.data;
	const tags = tagsQuery.data;

	return (
		<div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
			<section className="mb-6">
				<h1 className="text-4xl font-semibold tracking-tight">Search</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Search titles and question bodies. Answers appear on thread pages
					only.
				</p>
			</section>

			<section className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
				<aside className="space-y-5">
					<SidebarModule title="Filter" bodyClassName="space-y-4">
						<form action="/search" method="get" className="space-y-4">
							<label className="block">
								<span className="mb-1 block text-xs text-muted-foreground">
									Query
								</span>
								<input
									name="q"
									defaultValue={search.q ?? ""}
									placeholder="Search..."
									className="w-full border border-input bg-background px-3 py-2 text-sm outline-none"
								/>
							</label>

							<label className="block">
								<span className="mb-1 block text-xs text-muted-foreground">
									Sort
								</span>
								<select
									name="sort"
									defaultValue={search.sort ?? "latest"}
									className="w-full border border-input bg-background px-3 py-2 text-sm outline-none"
								>
									{sortOptions.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</label>

							<label className="block">
								<span className="mb-1 block text-xs text-muted-foreground">
									Tag
								</span>
								<select
									name="tag"
									defaultValue={search.tag ?? ""}
									className="w-full border border-input bg-background px-3 py-2 text-sm outline-none"
								>
									<option value="">All tags</option>
									{tags.map((tag) => (
										<option key={tag.slug} value={tag.slug}>
											{tag.slug}
										</option>
									))}
								</select>
							</label>

							<button
								type="submit"
								className="w-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
							>
								Apply Filters
							</button>
						</form>
					</SidebarModule>

					<SidebarModule title="Tags" className="hidden lg:block">
						<div className="flex flex-wrap gap-2">
							{tags.map((tag) => {
								const active = search.tag === tag.slug;
								return (
									<Link
										key={tag.slug}
										to="/search"
										search={{
											q: search.q ?? "",
											sort: search.sort ?? "latest",
											tag: active ? "" : tag.slug,
										}}
										className={
											active
												? "inline-flex rounded-sm bg-primary/20 px-2 py-1 text-xs text-foreground"
												: "inline-flex rounded-sm bg-secondary px-2 py-1 text-xs text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
										}
									>
										{tag.slug}
									</Link>
								);
							})}
						</div>
					</SidebarModule>
				</aside>

				<div className="min-w-0">
					<div className="mb-4 text-sm text-muted-foreground">
						{questions.length} results
						{search.q ? ` for "${search.q}"` : ""}
						{search.tag ? ` in ${search.tag}` : ""}
					</div>

					<div className="border-t border-border">
						{questions.length ? (
							questions.map((question) => (
								<QuestionCard
									key={question.id}
									question={question}
									eyebrow="Search result"
								/>
							))
						) : (
							<div className="border-b border-border py-8">
								<h2 className="text-xl font-semibold">No results</h2>
								<p className="mt-2 text-sm text-muted-foreground">
									Try a broader keyword or remove the tag filter.
								</p>
							</div>
						)}
					</div>

					<SidebarModule title="Browse Tags" className="mt-6 lg:hidden">
						<div className="flex flex-wrap gap-2">
							{tags.map((tag) => {
								const active = search.tag === tag.slug;
								return (
									<Link
										key={tag.slug}
										to="/search"
										search={{
											q: search.q ?? "",
											sort: search.sort ?? "latest",
											tag: active ? "" : tag.slug,
										}}
										className={
											active
												? "inline-flex rounded-sm bg-primary/20 px-2 py-1 text-xs text-foreground"
												: "inline-flex rounded-sm bg-secondary px-2 py-1 text-xs text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
										}
									>
										{tag.slug}
									</Link>
								);
							})}
						</div>
					</SidebarModule>
				</div>
			</section>
		</div>
	);
}
