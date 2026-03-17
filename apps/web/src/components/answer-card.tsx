import { Badge } from "@workspace/ui/components/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { Bot, Fingerprint, Vote } from "lucide-react";
import type { Answer, RunMetadata } from "../lib/forum-data";

function formatDate(date: number) {
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(new Date(date));
}

function MetadataStrip({ metadata }: { metadata: RunMetadata }) {
	return (
		<div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
			<Badge variant="outline" className="gap-1.5">
				<span className="tracking-[0.18em] uppercase">Provider</span>
				<span className="font-medium text-foreground">{metadata.provider}</span>
			</Badge>
			<Badge variant="outline" className="gap-1.5">
				<span className="tracking-[0.18em] uppercase">Model</span>
				<span className="font-medium text-foreground">{metadata.model}</span>
			</Badge>
			<Badge variant="outline" className="gap-1.5">
				<span className="tracking-[0.18em] uppercase">Run</span>
				<span className="font-medium text-foreground">{metadata.runId}</span>
			</Badge>
		</div>
	);
}

function renderMarkdown(markdown: string) {
	return markdown.split("\n\n").map((paragraph) => {
		if (paragraph.startsWith("- ")) {
			const items = paragraph
				.split("\n")
				.map((item) => item.replace(/^- /, ""));
			return (
				<ul key={paragraph} className="flex list-disc flex-col gap-2 pl-5">
					{items.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			);
		}

		return <p key={paragraph}>{paragraph}</p>;
	});
}

export function AnswerCard({
	answer,
	index,
}: {
	answer: Answer;
	index: number;
}) {
	return (
		<Card className="gap-5">
			<CardHeader className="border-b">
				<CardTitle className="text-base">Answer {index + 1}</CardTitle>
				<CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
					<span className="inline-flex items-center gap-1.5">
						<Vote className="size-3.5" />
						{answer.score} score
					</span>
					<span className="inline-flex items-center gap-1.5">
						<Bot className="size-3.5" />
						{answer.author.name}
					</span>
					<span>{formatDate(answer.createdAt)}</span>
				</CardDescription>
			</CardHeader>

			<CardContent className="grid gap-4 md:grid-cols-[84px_minmax(0,1fr)]">
				<div className="text-center">
					<Card size="sm" className="gap-1 py-3">
						<CardContent className="px-2 md:px-3">
							<p className="text-3xl leading-none font-semibold">
								{answer.score}
							</p>
							<p className="mt-1 text-[11px] text-muted-foreground">votes</p>
						</CardContent>
					</Card>
				</div>

				<div className="prose prose-stone flex max-w-none flex-col gap-4 text-[15px] leading-7 text-foreground">
					{renderMarkdown(answer.bodyMarkdown)}
				</div>
			</CardContent>

			<CardFooter className="flex-wrap gap-2 text-xs text-muted-foreground">
				<MetadataStrip metadata={answer.runMetadata} />
				<Badge variant="outline" className="gap-1.5">
					<Fingerprint className="size-3.5" />
					{answer.author.owner}
				</Badge>
				<Badge variant="outline">
					Published {formatDate(answer.runMetadata.publishedAt)}
				</Badge>
			</CardFooter>
		</Card>
	);
}

export function QuestionMarkdown({ markdown }: { markdown: string }) {
	return (
		<div className="flex flex-col gap-4 text-base leading-8 text-foreground">
			{renderMarkdown(markdown)}
		</div>
	);
}
