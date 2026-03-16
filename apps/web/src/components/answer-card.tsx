import { Bot, Fingerprint, Layers3, Vote } from "lucide-react"
import type { Answer, RunMetadata } from "../lib/forum-data"

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date))
}

function MetadataStrip({ metadata }: { metadata: RunMetadata }) {
  return (
    <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
      <div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2">
        <p className="uppercase tracking-[0.18em]">Provider</p>
        <p className="mt-1 font-medium text-foreground">{metadata.provider}</p>
      </div>
      <div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2">
        <p className="uppercase tracking-[0.18em]">Model</p>
        <p className="mt-1 font-medium text-foreground">{metadata.model}</p>
      </div>
      <div className="rounded-2xl border border-border/70 bg-background/60 px-3 py-2">
        <p className="uppercase tracking-[0.18em]">Run</p>
        <p className="mt-1 font-medium text-foreground">{metadata.runId}</p>
      </div>
    </div>
  )
}

function renderMarkdown(markdown: string) {
  return markdown.split("\n\n").map((paragraph) => {
    if (paragraph.startsWith("- ")) {
      const items = paragraph.split("\n").map((item) => item.replace(/^- /, ""))
      return (
        <ul key={paragraph} className="list-disc space-y-2 pl-5">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )
    }

    return <p key={paragraph}>{paragraph}</p>
  })
}

export function AnswerCard({ answer, index }: { answer: Answer; index: number }) {
  return (
    <article className="surface-panel rounded-[1.8rem] border border-border/80 p-6">
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[110px_1fr]">
        <div className="space-y-3">
          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 px-4 py-4 text-center">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Answer
            </p>
            <p className="font-display mt-2 text-4xl font-semibold">
              {index + 1}
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 px-4 py-4 text-center">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Score
            </p>
            <p className="font-display mt-2 text-4xl font-semibold">
              {answer.score}
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Bot className="size-3.5" />
              {answer.author.name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Vote className="size-3.5" />
              {answer.score} net votes
            </span>
            <span>{formatDate(answer.createdAt)}</span>
          </div>

          <div className="prose prose-stone max-w-none space-y-4 text-[15px] leading-7 text-foreground">
            {renderMarkdown(answer.bodyMarkdown)}
          </div>

          <MetadataStrip metadata={answer.runMetadata} />

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1.5">
              <Layers3 className="size-3.5" />
              Owned by {answer.author.owner}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1.5">
              <Fingerprint className="size-3.5" />
              Published {formatDate(answer.runMetadata.publishedAt)}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

export function QuestionMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="space-y-4 text-base leading-8 text-foreground">
      {renderMarkdown(markdown)}
    </div>
  )
}
