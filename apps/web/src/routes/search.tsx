import { convexAction, convexQuery } from "@convex-dev/react-query";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { api } from "@workspace/backend/convex/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@workspace/ui/components/select";
import { type FormEvent, useEffect, useState } from "react";
import { QuestionCard } from "../components/question-card";
import {
	parseSearchPageSearch,
	type SearchPageSearch,
} from "../lib/search-params";

const ALL_TAGS_VALUE = "__all_tags__";

function normalizeSearchValue(value: string | undefined) {
	const normalized = value?.trim();
	return normalized || undefined;
}

function buildSearchPageSearch(search: SearchPageSearch): SearchPageSearch {
	return {
		q: normalizeSearchValue(search.q),
		tag: normalizeSearchValue(search.tag),
	};
}

export const Route = createFileRoute("/search")({
	validateSearch: parseSearchPageSearch,
	loaderDeps: ({ search }) => buildSearchPageSearch(search),
	loader: async ({ context, deps }) => {
		if (deps.q) {
			await Promise.all([
				context.queryClient.ensureQueryData(
					convexAction(api.forum.searchQuestions, deps),
				),
				context.queryClient.ensureQueryData(
					convexQuery(api.forum.listTags, {}),
				),
			]);
			return;
		}

		await context.queryClient.ensureQueryData(
			convexQuery(api.forum.listTags, {}),
		);
	},
	component: SearchRoute,
});

function SearchRoute() {
	const search = Route.useSearch();
	const navigate = useNavigate();
	const tagsQuery = useSuspenseQuery(convexQuery(api.forum.listTags, {}));
	const tags = tagsQuery.data;
	const submittedQuery = normalizeSearchValue(search.q);
	const selectedTag = normalizeSearchValue(search.tag);
	const [queryDraft, setQueryDraft] = useState(submittedQuery ?? "");

	useEffect(() => {
		setQueryDraft(submittedQuery ?? "");
	}, [submittedQuery]);

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		void navigate({
			to: "/search",
			search: buildSearchPageSearch({
				q: queryDraft,
				tag: selectedTag,
			}),
		});
	};

	const handleTagChange = (value: string) => {
		void navigate({
			to: "/search",
			search: buildSearchPageSearch({
				q: submittedQuery,
				tag: value === ALL_TAGS_VALUE ? undefined : value,
			}),
		});
	};

	return (
		<div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
			<section className="mb-6">
				<h1 className="text-4xl font-semibold tracking-tight">Search</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Search titles and question bodies. Answers appear on thread pages
					only.
				</p>
			</section>

			<section className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
				<aside className="flex flex-col gap-5">
					<Card>
						<CardHeader className="border-b">
							<CardTitle>Semantic Search</CardTitle>
							<CardDescription>
								Search titles and question bodies with hybrid ranking.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<form onSubmit={handleSubmit} className="flex flex-col gap-4">
								<div className="flex flex-col gap-1.5">
									<Label htmlFor="search-query">Query</Label>
									<Input
										id="search-query"
										value={queryDraft}
										onChange={(event) => setQueryDraft(event.target.value)}
										placeholder="Search titles and question bodies..."
									/>
								</div>

								<div className="flex flex-col gap-1.5">
									<Label htmlFor="search-tag">Tag</Label>
									<Select
										value={selectedTag ?? ALL_TAGS_VALUE}
										onValueChange={handleTagChange}
									>
										<SelectTrigger id="search-tag" className="w-full">
											<SelectValue placeholder="All tags" />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												<SelectItem value={ALL_TAGS_VALUE}>All tags</SelectItem>
												{tags.map((tagOption) => (
													<SelectItem
														key={tagOption.slug}
														value={tagOption.slug}
													>
														{tagOption.slug}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</div>

								<Button type="submit" className="w-full">
									Search
								</Button>
							</form>
						</CardContent>
					</Card>

					<TagBrowseCard
						tags={tags}
						search={search}
						className="hidden lg:flex"
						title="Tags"
					/>
				</aside>

				<div className="min-w-0">
					{submittedQuery ? (
						<SearchResults
							submittedQuery={submittedQuery}
							selectedTag={selectedTag}
						/>
					) : (
						<SearchIdleState selectedTag={selectedTag} />
					)}

					<TagBrowseCard
						tags={tags}
						search={search}
						className="mt-6 flex lg:hidden"
						title="Browse Tags"
					/>
				</div>
			</section>
		</div>
	);
}

function SearchIdleState({ selectedTag }: { selectedTag: string | undefined }) {
	return (
		<Card>
			<CardHeader className="border-b">
				<CardTitle>Search the archive</CardTitle>
				<CardDescription>
					Search titles and question bodies across the archive.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
				<p>Start with a question, keyword, or error message.</p>
				{selectedTag ? (
					<div className="flex flex-wrap items-center gap-2">
						<span>Filtered to:</span>
						<Badge variant="secondary">{selectedTag}</Badge>
					</div>
				) : (
					<p>Add a tag to narrow the search if needed.</p>
				)}
			</CardContent>
		</Card>
	);
}

function SearchResults({
	submittedQuery,
	selectedTag,
}: {
	submittedQuery: string;
	selectedTag: string | undefined;
}) {
	const questionsQuery = useQuery(
		convexAction(
			api.forum.searchQuestions,
			buildSearchPageSearch({
				q: submittedQuery,
				tag: selectedTag,
			}),
		),
	);

	if (questionsQuery.error) {
		throw questionsQuery.error;
	}

	if (questionsQuery.isPending) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Loading results</CardTitle>
					<CardDescription>
						Running the current hybrid search query.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	const questions = questionsQuery.data ?? [];

	return (
		<>
			<div className="mb-4 flex flex-col gap-1">
				<div className="text-sm text-muted-foreground">
					{questions.length} results for "{submittedQuery}"
					{selectedTag ? ` in ${selectedTag}` : ""}
				</div>
				<p className="text-sm text-muted-foreground">
					Results follow the current hybrid-search relevance order. Lexical
					matches appear before semantic-only matches.
				</p>
			</div>

			<div className="flex flex-col gap-4">
				{questions.length ? (
					questions.map((question) => (
						<QuestionCard
							key={question.id}
							question={question}
							eyebrow="Search result"
						/>
					))
				) : (
					<Card>
						<CardHeader>
							<CardTitle>No results</CardTitle>
							<CardDescription>
								Try a broader query or remove the tag filter.
							</CardDescription>
						</CardHeader>
					</Card>
				)}
			</div>
		</>
	);
}

function TagBrowseCard({
	tags,
	search,
	title,
	className,
}: {
	tags: { slug: string }[];
	search: SearchPageSearch;
	title: string;
	className?: string;
}) {
	return (
		<Card className={className}>
			<CardHeader className="border-b">
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-wrap gap-2">
				{tags.map((tag) => {
					const active = search.tag === tag.slug;
					return (
						<Badge
							key={tag.slug}
							asChild
							variant={active ? "default" : "secondary"}
						>
							<Link
								to="/search"
								search={buildSearchPageSearch({
									q: search.q,
									tag: active ? undefined : tag.slug,
								})}
							>
								{tag.slug}
							</Link>
						</Badge>
					);
				})}
			</CardContent>
		</Card>
	);
}
