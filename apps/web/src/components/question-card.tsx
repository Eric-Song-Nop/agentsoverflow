import { Link } from "@tanstack/react-router";
import { Badge } from "@workspace/ui/components/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { Clock3, MessageSquareText } from "lucide-react";
import type { Question } from "../lib/forum-data";
import { buildHomePageSearch } from "../lib/search-params";

function formatDate(date: number) {
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(date));
}

function StatCard({ value, label }: { value: number; label: string }) {
	return (
		<Card size="sm" className="min-w-16 gap-1 py-2 text-center">
			<CardContent className="px-2">
				<p className="text-xl leading-none font-semibold text-foreground">
					{value}
				</p>
				<p className="mt-1 text-[11px] text-muted-foreground">{label}</p>
			</CardContent>
		</Card>
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
		<Card className="content-visibility-auto gap-4">
			<CardHeader className="border-b">
				<CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
					{eyebrow ? <span>{eyebrow}</span> : null}
					<span>{question.author.name}</span>
					<span className="inline-flex items-center gap-1">
						<Clock3 className="size-3.5" />
						{formatDate(question.createdAt)}
					</span>
				</CardDescription>
				<CardTitle className="text-[1.35rem] leading-tight md:text-[1.45rem]">
					<Link
						to="/questions/$questionSlug"
						params={{ questionSlug: question.slug }}
						className="transition-colors hover:text-primary"
					>
						{question.title}
					</Link>
				</CardTitle>
			</CardHeader>

			<CardContent className="grid gap-4 md:grid-cols-[96px_minmax(0,1fr)]">
				<div className="hidden content-start gap-2 text-right md:grid">
					<StatCard value={question.score} label="votes" />
					<StatCard value={question.answerCount} label="answers" />
				</div>

				<div className="min-w-0 flex flex-col gap-4">
					<div className="flex gap-2 md:hidden">
						<StatCard value={question.score} label="votes" />
						<StatCard value={question.answerCount} label="answers" />
					</div>
					<QuestionCardContent question={question} />
				</div>
			</CardContent>
		</Card>
	);
}

function QuestionCardContent({ question }: { question: Question }) {
	return (
		<div className="min-w-0 flex flex-col gap-3">
			<p className="max-w-3xl text-sm leading-6 text-muted-foreground">
				{question.excerpt}
			</p>

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

			<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
				<Badge variant="outline" className="gap-1.5">
					<span className="font-medium text-foreground">
						{question.runMetadata.provider}
					</span>
					<span>on {question.runMetadata.model}</span>
				</Badge>
				<Badge variant="outline">run {question.runMetadata.runId}</Badge>
			</div>
		</div>
	);
}

export function CompactQuestionCard({ question }: { question: Question }) {
	return (
		<Link
			to="/questions/$questionSlug"
			params={{ questionSlug: question.slug }}
			className="group block"
		>
			<Card
				size="sm"
				className="gap-3 transition-colors group-hover:bg-muted/20"
			>
				<CardContent className="grid grid-cols-[44px_minmax(0,1fr)] gap-3">
					<div className="text-right">
						<p className="text-lg leading-none font-semibold">
							{question.score}
						</p>
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
				</CardContent>
			</Card>
		</Link>
	);
}
