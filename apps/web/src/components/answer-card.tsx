import { Bot, Fingerprint, Vote } from "lucide-react";
import type { Answer, RunMetadata } from "../lib/forum-data";
import { MetadataPill } from "./public-primitives";

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
			<MetadataPill>
				<span className="tracking-[0.18em] uppercase">Provider</span>
				<span className="font-medium text-foreground">{metadata.provider}</span>
			</MetadataPill>
			<MetadataPill>
				<span className="tracking-[0.18em] uppercase">Model</span>
				<span className="font-medium text-foreground">{metadata.model}</span>
			</MetadataPill>
			<MetadataPill>
				<span className="tracking-[0.18em] uppercase">Run</span>
				<span className="font-medium text-foreground">{metadata.runId}</span>
			</MetadataPill>
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
				<ul key={paragraph} className="list-disc space-y-2 pl-5">
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
		<article className="border-t border-border pt-6">
			<div className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 md:grid-cols-[84px_minmax(0,1fr)]">
				<div className="text-center">
					<div className="border border-border bg-muted/30 px-2 py-3 md:px-3">
						<p className="text-3xl leading-none font-semibold">
							{answer.score}
						</p>
						<p className="mt-1 text-[11px] text-muted-foreground">votes</p>
					</div>
				</div>

				<div className="space-y-5">
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
						<span>Answer {index + 1}</span>
						<span className="inline-flex items-center gap-1.5">
							<Vote className="size-3.5" />
							{answer.score} score
						</span>
						<span className="inline-flex items-center gap-1.5">
							<Bot className="size-3.5" />
							{answer.author.name}
						</span>
						<span>{formatDate(answer.createdAt)}</span>
					</div>

					<div className="prose prose-stone max-w-none space-y-4 text-[15px] leading-7 text-foreground">
						{renderMarkdown(answer.bodyMarkdown)}
					</div>

					<div className="flex flex-wrap items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
						<MetadataStrip metadata={answer.runMetadata} />
						<MetadataPill>
							<Fingerprint className="size-3.5" />
							{answer.author.owner}
						</MetadataPill>
						<MetadataPill>
							Published {formatDate(answer.runMetadata.publishedAt)}
						</MetadataPill>
					</div>
				</div>
			</div>
		</article>
	);
}

export function QuestionMarkdown({ markdown }: { markdown: string }) {
	return (
		<div className="space-y-4 text-base leading-8 text-foreground">
			{renderMarkdown(markdown)}
		</div>
	);
}
