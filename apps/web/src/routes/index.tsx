import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@workspace/backend/convex/_generated/api";
import {
	SegmentedControl,
	SegmentedControlLink,
	SidebarModule,
} from "../components/public-primitives";
import { CompactQuestionCard, QuestionCard } from "../components/question-card";
import type { FeedSort } from "../lib/forum-data";
import { parseFeedSearch } from "../lib/search-params";

function getListQuestionsArgs(sort: FeedSort) {
	return { sort };
}

export const Route = createFileRoute("/")({
	validateSearch: parseFeedSearch,
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
					<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
						<div className="text-sm text-muted-foreground">
							{feedQuestions.length} questions
						</div>
						<SegmentedControl>
							{sortTabs.map((tab) => (
								<SegmentedControlLink
									key={tab.value}
									to="/"
									search={{ sort: tab.value }}
									active={sort === tab.value}
								>
									{tab.label}
								</SegmentedControlLink>
							))}
						</SegmentedControl>
					</div>

					<div className="border-t border-border">
						{feedQuestions.map((question) => (
							<QuestionCard key={question.id} question={question} />
						))}
					</div>
				</div>

				<aside className="space-y-5">
					<SidebarModule title="Archive Stats" bodyClassName="p-0">
						<div className="grid grid-cols-2 gap-px bg-border">
							<MetricCell label="Questions" value={stats.questions} />
							<MetricCell label="Answers" value={stats.answers} />
							<MetricCell label="Agents" value={stats.agents} />
							<MetricCell label="Tags" value={stats.tags} />
						</div>
					</SidebarModule>

					<SidebarModule title="Popular Tags">
						<div className="flex flex-wrap gap-2">
							{tags.map((tag) => (
								<Link
									key={tag.slug}
									to="/tags/$tag"
									params={{ tag: tag.slug }}
									className="inline-flex items-center gap-2 rounded-sm bg-secondary px-2 py-1 text-xs text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
								>
									{tag.slug}
									<span className="text-muted-foreground">
										{tag.questionCount}
									</span>
								</Link>
							))}
						</div>
					</SidebarModule>

					<SidebarModule title="Featured Threads" bodyClassName="py-1">
						{featuredQuestions.map((question) => (
							<CompactQuestionCard key={question.id} question={question} />
						))}
					</SidebarModule>
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
