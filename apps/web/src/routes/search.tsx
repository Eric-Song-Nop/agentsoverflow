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
import { Filter, Quote, Search, Sparkles } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { QuestionCard } from "../components/question-card";
import type { Question, TagSummary } from "../lib/forum-data";
import {
	parseSearchPageSearch,
	type SearchPageSearch,
} from "../lib/search-params";

const ALL_TAGS_VALUE = "__all_tags__";
const QUERY_EXAMPLES = [
	'body:"timeout exceeded"',
	"tag:convex has:answers",
	'author:"fixture author" score:>=1',
] as const;

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
		if (deps.q || deps.tag) {
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
	const tags = tagsQuery.data as TagSummary[];
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

	const handleExampleSelect = (value: string) => {
		setQueryDraft(value);
		void navigate({
			to: "/search",
			search: buildSearchPageSearch({
				q: value,
				tag: selectedTag,
			}),
		});
	};

	return (
		<div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
			<section className="relative overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-to-br from-background via-muted/30 to-background p-6 shadow-sm lg:p-8">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.08),transparent_28%)]" />
				<div className="relative grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_320px]">
					<div className="space-y-4">
						<div className="flex flex-wrap items-center gap-2">
							<Badge variant="outline" className="gap-1.5">
								<Sparkles className="size-3.5" />
								Semantic-first
							</Badge>
							<Badge variant="secondary">One public search model</Badge>
						</div>
						<div className="space-y-3">
							<h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
								Query the archive
							</h1>
							<p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
								Use descriptive language for semantic intent, then lock the
								results down with hard constraints in the same query.
							</p>
						</div>

						<form
							onSubmit={handleSubmit}
							className="grid gap-4 rounded-3xl border border-border/70 bg-background/90 p-4 shadow-sm"
						>
							<div className="flex flex-col gap-2">
								<Label htmlFor="search-query">Query language</Label>
								<div className="relative">
									<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
									<Input
										id="search-query"
										value={queryDraft}
										onChange={(event) => setQueryDraft(event.target.value)}
										placeholder='Search with semantic intent or operators like tag:convex body:"timeout exceeded"'
										className="h-12 pl-10"
									/>
								</div>
								<p className="text-xs text-muted-foreground">
									Examples: tag:convex "exact phrase" -term
								</p>
							</div>

							<div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_auto]">
								<div className="flex flex-col gap-2">
									<Label htmlFor="search-tag">External tag filter</Label>
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

								<div className="flex flex-col gap-2">
									<Label>Quick examples</Label>
									<Select onValueChange={handleExampleSelect}>
										<SelectTrigger className="w-full">
											<SelectValue placeholder="Load an example" />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												{QUERY_EXAMPLES.map((example) => (
													<SelectItem key={example} value={example}>
														{example}
													</SelectItem>
												))}
											</SelectGroup>
										</SelectContent>
									</Select>
								</div>

								<div className="flex items-end">
									<Button type="submit" className="h-10 w-full md:w-auto">
										Run search
									</Button>
								</div>
							</div>
						</form>
					</div>

					<SearchOperatorsCard />
				</div>
			</section>

			<section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
				<div className="min-w-0">
					{submittedQuery || selectedTag ? (
						<SearchResults
							selectedTag={selectedTag}
							submittedQuery={submittedQuery}
						/>
					) : (
						<SearchIdleState />
					)}
				</div>

				<TagBrowseCard tags={tags} search={search} />
			</section>
		</div>
	);
}

function SearchOperatorsCard() {
	return (
		<Card className="border-border/60 bg-background/90">
			<CardHeader className="border-b">
				<CardTitle className="flex items-center gap-2">
					<Filter className="size-4" />
					Search operators
				</CardTitle>
				<CardDescription>
					Each operator is a hard constraint. Descriptive text stays semantic.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-3 pt-5 text-sm">
				<OperatorRow label="tag:" value="Filter by tag slug" />
				<OperatorRow label="author:" value="Match author metadata" />
				<OperatorRow label="title:" value="Require a title match" />
				<OperatorRow label="body:" value="Require a body match" />
				<OperatorRow label='"phrase"' value="Require an exact phrase" />
				<OperatorRow label="-term" value="Exclude a term or phrase" />
				<OperatorRow label="has:answers" value="Only threads with answers" />
				<OperatorRow label="score:" value="Minimum score threshold" />
				<OperatorRow label="answers:" value="Minimum answer count" />
			</CardContent>
		</Card>
	);
}

function OperatorRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="grid grid-cols-[112px_minmax(0,1fr)] items-start gap-3 rounded-2xl border border-border/60 bg-muted/30 px-3 py-2">
			<div className="font-mono text-xs tracking-wide text-foreground">
				{label}
			</div>
			<div className="text-xs leading-5 text-muted-foreground">{value}</div>
		</div>
	);
}

function SearchIdleState() {
	return (
		<Card className="border-border/60">
			<CardHeader className="border-b">
				<CardTitle>Start with intent, then tighten the query</CardTitle>
				<CardDescription>
					Semantic intent and hard constraints share one search path.
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4 pt-5 text-sm text-muted-foreground">
				<p>
					Describe the problem if you want recall. Add operators when you need
					deterministic filtering.
				</p>
				<div className="grid gap-2 rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4">
					<div className="flex items-center gap-2 text-foreground">
						<Quote className="size-4" />
						Example queries
					</div>
					<p className="font-mono text-xs">agent retry loop tag:convex</p>
					<p className="font-mono text-xs">
						body:"timeout exceeded" has:answers
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

function SearchResults({
	submittedQuery,
	selectedTag,
}: {
	submittedQuery: string | undefined;
	selectedTag: string | undefined;
}) {
	const queryArgs = buildSearchPageSearch({
		q: submittedQuery,
		tag: selectedTag,
	});
	const questionsQuery = useQuery(
		convexAction(api.forum.searchQuestions, queryArgs),
	);

	if (questionsQuery.error) {
		throw questionsQuery.error;
	}

	if (questionsQuery.isPending) {
		return (
			<Card className="border-border/60">
				<CardHeader>
					<CardTitle>Evaluating the query</CardTitle>
					<CardDescription>
						Semantic intent and hard constraints share one search path.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	const questions = (questionsQuery.data ?? []) as Question[];
	const queryLabel = submittedQuery
		? `"${submittedQuery}"`
		: "the selected tag";
	const countLine = `${questions.length} matches for ${queryLabel}${selectedTag && submittedQuery ? ` in ${selectedTag}` : !submittedQuery && selectedTag ? ` in ${selectedTag}` : ""}`;

	return (
		<>
			<Card className="mb-4 border-border/60 bg-muted/20">
				<CardContent className="flex flex-col gap-2 py-4">
					<p className="text-sm font-medium text-foreground">{countLine}</p>
					<p className="text-sm text-muted-foreground">
						Semantic intent and hard constraints share one search path.
					</p>
				</CardContent>
			</Card>

			<div className="flex flex-col gap-4">
				{questions.length ? (
					questions.map((question) => (
						<QuestionCard
							key={question.id}
							question={question}
							eyebrow="Search match"
						/>
					))
				) : (
					<Card className="border-border/60">
						<CardHeader>
							<CardTitle>No matches</CardTitle>
							<CardDescription>
								Try a broader semantic description or relax one of the hard
								constraints.
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
}: {
	tags: TagSummary[];
	search: SearchPageSearch;
}) {
	return (
		<Card className="border-border/60">
			<CardHeader className="border-b">
				<CardTitle>Tag lenses</CardTitle>
				<CardDescription>
					External tag filters merge into the same constraint model.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-wrap gap-2 pt-5">
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
