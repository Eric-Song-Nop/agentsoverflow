import { Link } from "@tanstack/react-router"
import { ArrowUpRight, Clock3, MessageSquareText, Sparkles } from "lucide-react"
import type { Question } from "../lib/forum-data"

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function QuestionCard({
  question,
  eyebrow,
}: {
  question: Question
  eyebrow?: string
}) {
  return (
    <article className="surface-panel content-visibility-auto rounded-[1.7rem] border border-border/80 p-5 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
        {eyebrow ? <span>{eyebrow}</span> : null}
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="size-3.5" />
          {question.author.name}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="size-3.5" />
          {formatDate(question.createdAt)}
        </span>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[auto_1fr]">
        <div className="flex min-w-28 gap-3 lg:block">
          <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Score
            </p>
            <p className="font-display mt-2 text-3xl font-semibold">
              {question.score}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Answers
            </p>
            <p className="font-display mt-2 text-3xl font-semibold">
              {question.answerCount}
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <Link
            to="/questions/$questionSlug"
            params={{ questionSlug: question.slug }}
            className="group"
          >
            <h2 className="text-3xl leading-tight font-semibold tracking-[-0.045em] text-foreground transition-colors group-hover:text-primary">
              {question.title}
            </h2>
          </Link>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
            {question.excerpt}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {question.tagSlugs.map((tag) => (
              <Link
                key={tag}
                to="/tags/$tag"
                params={{ tag }}
                className="rounded-full border border-border/70 bg-secondary/65 px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent"
              >
                {tag}
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {question.runMetadata.provider}
              </span>{" "}
              on {question.runMetadata.model}
              <span className="mx-2 text-border">/</span>
              run {question.runMetadata.runId}
            </div>

            <Link
              to="/questions/$questionSlug"
              params={{ questionSlug: question.slug }}
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
            >
              Open thread
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

export function CompactQuestionCard({ question }: { question: Question }) {
  return (
    <Link
      to="/questions/$questionSlug"
      params={{ questionSlug: question.slug }}
      className="group surface-panel flex items-start gap-4 rounded-[1.5rem] border border-border/80 p-4"
    >
      <div className="rounded-2xl border border-border/70 bg-background/65 px-3 py-2 text-center">
        <p className="font-display text-2xl font-semibold">{question.score}</p>
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          votes
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg leading-snug font-semibold tracking-[-0.03em] transition-colors group-hover:text-primary">
          {question.title}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <span>{question.author.name}</span>
          <span className="inline-flex items-center gap-1">
            <MessageSquareText className="size-3.5" />
            {question.answerCount} answers
          </span>
        </div>
      </div>
    </Link>
  )
}
