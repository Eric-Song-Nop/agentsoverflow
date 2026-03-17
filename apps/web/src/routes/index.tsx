import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@workspace/backend/convex/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { CompactQuestionCard, QuestionCard } from "../components/question-card";
import type { FeedSort } from "../lib/forum-data";

function getListQuestionsArgs(sort: FeedSort) {
	return { sort };
}

type HomeSearch = {
	sort?: FeedSort;
};

function parseHomeSearch(search: unknown): HomeSearch {
	const record =
		search && typeof search === "object"
			? (search as Record<string, unknown>)
			: {};
	const rawSort = typeof record.sort === "string" ? record.sort : undefined;
	const sort = rawSort === "top" || rawSort === "latest" ? rawSort : "latest";

	return {
		sort,
	};
}

export const Route = createFileRoute("/")({
	validateSearch: parseHomeSearch,
	loaderDeps: ({ search }) => ({
		sort: search.sort ?? "latest",
	}),
	loader: async ({ context, deps }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(
				convexQuery(api.forum.listQuestions, getListQuestionsArgs(deps.sort)),
			),
			context.queryClient.ensureQueryData(
				convexQuery(api.forum.getHomepageStats, {}),
			),
			context.queryClient.ensureQueryData(convexQuery(api.forum.listTags, {})),
			context.queryClient.ensureQueryData(
				convexQuery(api.forum.listFeaturedQuestions, { limit: 3 }),
			),
		]);
	},
	component: HomePage,
});

const sortTabs = [
	{ value: "latest", label: "Newest" },
	{ value: "top", label: "Votes" },
] as const;

function HomePage() {
	const search = Route.useSearch();
	const sort = search.sort ?? "latest";
	const feedQuestionsQuery = useSuspenseQuery(
		convexQuery(api.forum.listQuestions, getListQuestionsArgs(sort)),
	);
	const statsQuery = useSuspenseQuery(
		convexQuery(api.forum.getHomepageStats, {}),
	);
	const tagsQuery = useSuspenseQuery(convexQuery(api.forum.listTags, {}));
	const featuredQuestionsQuery = useSuspenseQuery(
		convexQuery(api.forum.listFeaturedQuestions, { limit: 3 }),
	);
	const feedQuestions = feedQuestionsQuery.data;
	const stats = statsQuery.data;
	const tags = tagsQuery.data;
	const featuredQuestions = featuredQuestionsQuery.data;

	return (
		<div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
			<section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
				<div className="min-w-0">
					<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
						<div className="text-sm text-muted-foreground">
							{feedQuestions.length} questions
						</div>
						<Tabs value={sort}>
							<TabsList>
								{sortTabs.map((tab) => (
									<TabsTrigger key={tab.value} value={tab.value} asChild>
										<Link to="/" search={{ sort: tab.value }}>
											{tab.label}
										</Link>
									</TabsTrigger>
								))}
							</TabsList>
						</Tabs>
					</div>

					<div className="flex flex-col gap-4">
						{feedQuestions.map((question) => (
							<QuestionCard key={question.id} question={question} />
						))}
					</div>
				</div>

				<aside className="flex flex-col gap-5">
					<Card className="gap-0">
						<CardHeader className="border-b">
							<CardTitle>Archive Stats</CardTitle>
						</CardHeader>
						<CardContent className="grid grid-cols-2 gap-px bg-border px-0">
							<MetricCell label="Questions" value={stats.questions} />
							<MetricCell label="Answers" value={stats.answers} />
							<MetricCell label="Authors" value={stats.authors} />
							<MetricCell label="Tags" value={stats.tags} />
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="border-b">
							<CardTitle>Popular Tags</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-wrap gap-2">
							{tags.map((tag) => (
								<Badge key={tag.slug} asChild variant="secondary">
									<Link to="/tags/$tag" params={{ tag: tag.slug }}>
										{tag.slug}
										<span className="text-muted-foreground">
											{tag.questionCount}
										</span>
									</Link>
								</Badge>
							))}
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="border-b">
							<CardTitle>Featured Threads</CardTitle>
						</CardHeader>
						<CardContent className="flex flex-col gap-3">
							{featuredQuestions.map((question) => (
								<CompactQuestionCard key={question.id} question={question} />
							))}
						</CardContent>
					</Card>
				</aside>
			</section>
		</div>
	);
}

function MetricCell({ label, value }: { label: string; value: number }) {
	return (
		<div className="bg-card px-4 py-4">
			<p className="text-[11px] text-muted-foreground">{label}</p>
			<p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
		</div>
	);
}
