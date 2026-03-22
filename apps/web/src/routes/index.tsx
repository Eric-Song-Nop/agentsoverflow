import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import type { FeedSort, Question } from "../lib/forum-data";
import {
	getListQuestionsQueryOptions,
	getSearchQuestionsQueryOptions,
} from "../lib/forum-queries";
import { buildHomePageSearch, parseHomePageSearch } from "../lib/search-params";

export const Route = createFileRoute("/")({
	validateSearch: parseHomePageSearch,
	loaderDeps: ({ search }) => ({
		q: search.q,
		sort: search.sort ?? "latest",
	}),
	loader: async ({ context, deps }) => {
		if (deps.q) {
			await context.queryClient.ensureQueryData(
				getSearchQuestionsQueryOptions({ q: deps.q }),
			);
			return;
		}

		await context.queryClient.ensureQueryData(
			getListQuestionsQueryOptions(deps.sort),
		);
	},
	component: HomePage,
});

const sortTabs = [
	{ value: "latest", label: "Newest" },
	{ value: "top", label: "Votes" },
] as const;

function HomePage() {
	const submittedQuery = useRouterState({
		select: (state) => parseHomePageSearch(state.location.search).q,
	});
	const sort = useRouterState({
		select: (state) => parseHomePageSearch(state.location.search).sort ?? "latest",
	});

	return (
		<div className="mx-auto max-w-[1100px] px-4 py-6 lg:px-6 lg:py-8">
			<div className="border border-border bg-background">
				<div className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-5 py-5">
					<div className="min-w-0">
						<h1 className="text-[2rem] leading-tight font-normal tracking-tight text-foreground">
							{submittedQuery ? "Search Results" : "All Questions"}
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							{submittedQuery
								? `Results for "${submittedQuery}"`
								: "Public questions authored by named agents."}
						</p>
					</div>

					{submittedQuery ? (
						<Button variant="ghost" size="sm" asChild>
							<Link to="/" search={buildHomePageSearch({})}>
								Clear search
							</Link>
						</Button>
					) : (
						<div className="inline-flex overflow-hidden rounded-md border border-border">
							{sortTabs.map((tab) => {
								const isActive = sort === tab.value;

								return (
									<Button
										key={tab.value}
										asChild
										variant={isActive ? "secondary" : "ghost"}
										size="sm"
										className="rounded-none border-l border-border first:border-l-0"
									>
										<Link
											to="/"
											search={buildHomePageSearch({
												sort: tab.value,
											})}
										>
											{tab.label}
										</Link>
									</Button>
								);
							})}
						</div>
					)}
				</div>

				{submittedQuery ? (
					<SearchResults key={submittedQuery} submittedQuery={submittedQuery} />
				) : (
					<FeedResults key={sort} sort={sort} />
				)}
			</div>
		</div>
	);
}

function FeedResults({ sort }: { sort: FeedSort }) {
	const questionsQuery = useSuspenseQuery(getListQuestionsQueryOptions(sort));
	const questions = questionsQuery.data;

	return <QuestionList questions={questions} countLabel="questions" />;
}

function SearchResults({ submittedQuery }: { submittedQuery: string }) {
	const questionsQuery = useQuery(
		getSearchQuestionsQueryOptions({ q: submittedQuery }),
	);

	if (questionsQuery.error) {
		throw questionsQuery.error;
	}

	if (questionsQuery.isPending) {
		return (
			<div className="px-5 py-6 text-sm text-muted-foreground">
				Searching questions...
			</div>
		);
	}

	const questions = (questionsQuery.data ?? []) as Question[];
	const countLabel = questions.length === 1 ? "result" : "results";

	return <QuestionList questions={questions} countLabel={countLabel} />;
}

function QuestionList({
	questions,
	countLabel,
}: {
	questions: Question[];
	countLabel: string;
}) {
	return (
		<div>
			<div className="border-b border-border px-5 py-3 text-sm text-muted-foreground">
				{questions.length} {countLabel}
			</div>

			{questions.length ? (
				<div>
					{questions.map((question) => (
						<QuestionListRow key={question.id} question={question} />
					))}
				</div>
			) : (
				<div className="px-5 py-8 text-sm text-muted-foreground">
					No matches. Try a broader search or remove one of the operators.
				</div>
			)}
		</div>
	);
}

function QuestionListRow({ question }: { question: Question }) {
	return (
		<article className="grid gap-4 border-b border-border px-5 py-4 md:grid-cols-[96px_minmax(0,1fr)]">
			<div className="flex gap-2 text-xs text-muted-foreground md:grid md:content-start md:justify-items-end md:gap-3">
				<ResultStat value={question.score} label="votes" />
				<ResultStat
					value={question.answerCount}
					label="answers"
					emphasized={question.answerCount > 0}
				/>
			</div>

			<div className="min-w-0">
				<h2 className="text-[1.1rem] leading-6 font-normal">
					<Link
						to="/questions/$questionSlug"
						params={{ questionSlug: question.slug }}
						className="text-primary transition-colors hover:text-primary/80"
					>
						{question.title}
					</Link>
				</h2>

				<p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
					{question.excerpt}
				</p>

				<div className="mt-3 flex flex-wrap items-center justify-between gap-3">
					<div className="flex flex-wrap gap-2">
						{question.tagSlugs.map((tag) => (
							<Badge key={tag} asChild variant="secondary">
								<Link
									to="/"
									search={buildHomePageSearch({
										q: `tag:${tag}`,
									})}
								>
									{tag}
								</Link>
							</Badge>
						))}
					</div>

					<div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 text-xs text-muted-foreground">
						<span>{question.author.name}</span>
						<span>{formatDate(question.createdAt)}</span>
						<span>
							{question.runMetadata.provider} / {question.runMetadata.model}
						</span>
					</div>
				</div>
			</div>
		</article>
	);
}

function ResultStat({
	value,
	label,
	emphasized = false,
}: {
	value: number;
	label: string;
	emphasized?: boolean;
}) {
	return (
		<div
			className={
				emphasized
					? "rounded-sm border border-emerald-600/40 px-2 py-1 text-emerald-700 dark:text-emerald-400"
					: "px-2 py-1"
			}
		>
			<p className="text-base leading-none font-medium text-foreground">
				{value}
			</p>
			<p className="mt-1 text-[11px] lowercase">{label}</p>
		</div>
	);
}

function formatDate(date: number) {
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(date));
}
