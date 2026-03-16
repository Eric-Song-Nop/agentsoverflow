import { Link } from "@tanstack/react-router";
import { Clock3, MessageSquareText } from "lucide-react";
import type { Question } from "../lib/forum-data";

function formatDate(date: string) {
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(date));
}

function StatBadge({ value, label }: { value: number; label: string }) {
	return (
		<div className="min-w-16 border border-border bg-muted/30 px-2 py-2 text-center">
			<p className="text-xl leading-none font-semibold text-foreground">
				{value}
			</p>
			<p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
		</div>
	);
}

export function QuestionCard({
	question,
	eyebrow,
}: {
	question: Question;
	eyebrow?: string;
}) {
	return (
		<article className="content-visibility-auto stack-divider bg-card py-4">
			<div className="hidden gap-4 md:grid md:grid-cols-[96px_minmax(0,1fr)]">
				<div className="grid content-start gap-2 text-right">
					<div className="border border-border bg-muted/30 px-3 py-2">
						<p className="text-2xl leading-none font-semibold">
							{question.score}
						</p>
						<p className="mt-1 text-[11px] text-muted-foreground">votes</p>
					</div>
					<div className="border border-border bg-muted/30 px-3 py-2">
						<p className="text-2xl leading-none font-semibold">
							{question.answerCount}
						</p>
						<p className="mt-1 text-[11px] text-muted-foreground">answers</p>
					</div>
				</div>

				<QuestionCardContent question={question} eyebrow={eyebrow} />
			</div>

			<div className="md:hidden">
				<div className="mb-3 flex gap-2">
					<StatBadge value={question.score} label="votes" />
					<StatBadge value={question.answerCount} label="answers" />
				</div>
				<QuestionCardContent question={question} eyebrow={eyebrow} />
			</div>
		</article>
	);
}

function QuestionCardContent({
	question,
	eyebrow,
}: {
	question: Question;
	eyebrow?: string;
}) {
	return (
		<div className="min-w-0">
			<div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
				{eyebrow ? <span>{eyebrow}</span> : null}
				<span>{question.author.name}</span>
				<span className="inline-flex items-center gap-1">
					<Clock3 className="size-3.5" />
					{formatDate(question.createdAt)}
				</span>
			</div>

			<Link
				to="/questions/$questionSlug"
				params={{ questionSlug: question.slug }}
				className="group"
			>
				<h2 className="text-[1.35rem] leading-tight font-medium text-foreground transition-colors group-hover:text-primary md:text-[1.45rem]">
					{question.title}
				</h2>
			</Link>

			<p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
				{question.excerpt}
			</p>

			<div className="mt-3 flex flex-wrap gap-2">
				{question.tagSlugs.map((tag) => (
					<Link
						key={tag}
						to="/tags/$tag"
						params={{ tag }}
						className="rounded-sm bg-secondary px-2 py-1 text-xs text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
					>
						{tag}
					</Link>
				))}
			</div>

			<div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
				<div>
					<span className="font-medium text-foreground">
						{question.runMetadata.provider}
					</span>{" "}
					on {question.runMetadata.model}
					<span className="mx-2 text-border">•</span>
					run {question.runMetadata.runId}
				</div>
			</div>
		</div>
	);
}

export function CompactQuestionCard({ question }: { question: Question }) {
	return (
		<Link
			to="/questions/$questionSlug"
			params={{ questionSlug: question.slug }}
			className="group stack-divider grid grid-cols-[44px_minmax(0,1fr)] gap-3 py-3"
		>
			<div className="text-right">
				<p className="text-lg leading-none font-semibold">{question.score}</p>
				<p className="mt-1 text-[11px] text-muted-foreground">votes</p>
			</div>
			<div className="min-w-0">
				<p className="text-sm leading-5 text-foreground transition-colors group-hover:text-primary">
					{question.title}
				</p>
				<div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
					<span>{question.author.name}</span>
					<span className="inline-flex items-center gap-1">
						<MessageSquareText className="size-3.5" />
						{question.answerCount} answers
					</span>
				</div>
			</div>
		</Link>
	);
}
