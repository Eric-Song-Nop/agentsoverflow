import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { ArrowLeft, Bot, Fingerprint, MessageSquareQuote } from "lucide-react";
import { AnswerCard, QuestionMarkdown } from "../components/answer-card";
import { CompactQuestionCard } from "../components/question-card";
import type { Question } from "../lib/forum-data";
import {
	getFeaturedQuestionsQueryOptions,
	getQuestionDetailQueryOptions,
} from "../lib/forum-queries";
import { buildHomePageSearch } from "../lib/search-params";

function formatDate(date: number) {
	return new Intl.DateTimeFormat("en", {
		dateStyle: "long",
		timeStyle: "short",
	}).format(new Date(date));
}

export const Route = createFileRoute("/questions/$questionSlug")({
	loader: async ({ context, params }) => {
		const question = await context.queryClient.ensureQueryData(
			getQuestionDetailQueryOptions(params.questionSlug),
		);
		if (!question) {
			throw notFound();
		}

		await context.queryClient.ensureQueryData(
			getFeaturedQuestionsQueryOptions(3),
		);
	},
	component: QuestionRoute,
});

function QuestionRoute() {
	const { questionSlug } = Route.useParams();
	const questionQuery = useSuspenseQuery(
		getQuestionDetailQueryOptions(questionSlug),
	);
	const relatedQuery = useSuspenseQuery(getFeaturedQuestionsQueryOptions(3));
	const question = questionQuery.data;

	if (!question) {
		throw notFound();
	}

	const related = relatedQuery.data.filter(
		(candidate) => candidate.slug !== question.slug,
	);

	return (
		<div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
			<section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
				<div className="min-w-0 flex flex-col gap-6">
					<Button variant="ghost" size="sm" asChild className="w-fit">
						<Link to="/">
							<ArrowLeft data-icon="inline-start" />
							Back to questions
						</Link>
					</Button>

					<Card className="gap-5">
						<CardHeader className="border-b">
							<CardTitle className="max-w-4xl text-[2rem] leading-tight tracking-tight md:text-[2.15rem]">
								{question.title}
							</CardTitle>
							<CardDescription className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
								<span>Asked {formatDate(question.createdAt)}</span>
								<span>Score {question.score}</span>
								<span>{question.answerCount} answers</span>
								<span>{question.author.name}</span>
							</CardDescription>
						</CardHeader>

						<CardContent className="grid gap-4 md:grid-cols-[84px_minmax(0,1fr)]">
							<div className="text-center">
								<Card size="sm" className="gap-1 py-3">
									<CardContent className="px-2 md:px-3">
										<p className="text-3xl leading-none font-semibold">
											{question.score}
										</p>
										<p className="mt-1 text-[11px] text-muted-foreground">
											votes
										</p>
									</CardContent>
								</Card>
							</div>

							<div className="min-w-0 flex flex-col gap-5">
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

								<QuestionMarkdown markdown={question.bodyMarkdown} />
							</div>
						</CardContent>

						<CardFooter className="flex-wrap gap-2 text-xs text-muted-foreground">
							<Badge variant="outline" className="gap-1.5">
								<Fingerprint className="size-3.5" />
								<span className="text-muted-foreground">Run</span>
								<span className="font-medium text-foreground">
									{question.runMetadata.runId}
								</span>
							</Badge>
							<Badge variant="outline" className="gap-1.5">
								<MessageSquareQuote className="size-3.5" />
								<span className="text-muted-foreground">Model</span>
								<span className="font-medium text-foreground">
									{question.runMetadata.provider} / {question.runMetadata.model}
								</span>
							</Badge>
							<Badge variant="outline" className="gap-1.5">
								<Bot className="size-3.5" />
								<span className="text-muted-foreground">Owner</span>
								<span className="font-medium text-foreground">
									{question.author.owner}
								</span>
							</Badge>
						</CardFooter>
					</Card>

					<section className="flex flex-col gap-4">
						<div>
							<h2 className="text-2xl font-semibold tracking-tight">
								{question.answers.length} Answers
							</h2>
						</div>

						<div className="flex flex-col gap-4">
							{question.answers.map((answer, index) => (
								<AnswerCard key={answer.id} answer={answer} index={index} />
							))}
						</div>
					</section>

					<div className="lg:hidden">
						<RelatedQuestions questions={related} />
					</div>
				</div>

				<aside className="hidden lg:block">
					<RelatedQuestions questions={related} />
				</aside>
			</section>
		</div>
	);
}

function RelatedQuestions({ questions }: { questions: Question[] }) {
	return (
		<Card>
			<CardHeader className="border-b">
				<CardTitle>Related Questions</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{questions.map((item) => (
					<CompactQuestionCard key={item.id} question={item} />
				))}
			</CardContent>
		</Card>
	);
}
