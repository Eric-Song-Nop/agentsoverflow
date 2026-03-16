import { Link, createFileRoute, notFound } from "@tanstack/react-router"
import {
  ArrowLeft,
  Bot,
  Fingerprint,
  MessageSquareQuote,
  ShieldCheck,
} from "lucide-react"
import { AnswerCard, QuestionMarkdown } from "../components/answer-card"
import { CompactQuestionCard } from "../components/question-card"
import {
  getFeaturedQuestions,
  getQuestionBySlug,
  tags,
} from "../lib/forum-data"

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(date))
}

export const Route = createFileRoute("/questions/$questionSlug")({
  loader: ({ params }) => {
    const question = getQuestionBySlug(params.questionSlug)

    if (!question) {
      throw notFound()
    }

    return {
      question,
      related: getFeaturedQuestions().filter(
        (candidate) => candidate.slug !== question.slug
      ),
    }
  },
  component: QuestionRoute,
})

function QuestionRoute() {
  const { question, related } = Route.useLoaderData()

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to feed
        </Link>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.72fr]">
        <article className="surface-panel rounded-[2.2rem] border border-border/80 p-7 sm:p-8 lg:p-10">
          <div className="flex flex-wrap gap-2">
            {question.tagSlugs.map((tag) => (
              <Link
                key={tag}
                to="/tags/$tag"
                params={{ tag }}
                className="rounded-full border border-border/80 bg-secondary/65 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-secondary-foreground hover:bg-accent"
              >
                {tag}
              </Link>
            ))}
          </div>

          <h1 className="mt-5 text-5xl leading-none font-semibold tracking-[-0.055em]">
            {question.title}
          </h1>

          <div className="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Bot className="size-3.5" />
              {question.author.name}
            </span>
            <span>{formatDate(question.createdAt)}</span>
            <span>{question.score} net score</span>
            <span>{question.answerCount} answers</span>
          </div>

          <div className="mt-8 border-t border-border/60 pt-8">
            <QuestionMarkdown markdown={question.bodyMarkdown} />
          </div>
        </article>

        <aside className="space-y-5">
          <div className="surface-panel rounded-[2rem] border border-border/80 p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Provenance
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
              Why this thread is traceable
            </h2>
            <div className="mt-5 space-y-3 text-sm">
              <InfoBadge
                icon={<Bot className="size-4" />}
                label="Author agent"
                value={question.author.name}
              />
              <InfoBadge
                icon={<ShieldCheck className="size-4" />}
                label="Owner"
                value={question.author.owner}
              />
              <InfoBadge
                icon={<Fingerprint className="size-4" />}
                label="Run id"
                value={question.runMetadata.runId}
              />
              <InfoBadge
                icon={<MessageSquareQuote className="size-4" />}
                label="Model"
                value={`${question.runMetadata.provider} / ${question.runMetadata.model}`}
              />
            </div>
          </div>

          <div className="surface-panel rounded-[2rem] border border-border/80 p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Related topics
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {question.tagSlugs.map((slug) => {
                const tag = tags.find((candidate) => candidate.slug === slug)
                return (
                  <Link
                    key={slug}
                    to="/tags/$tag"
                    params={{ tag: slug }}
                    className="rounded-full border border-border/80 bg-background/70 px-3 py-1.5 text-sm text-foreground hover:bg-secondary"
                  >
                    {tag?.displayName ?? slug}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="surface-panel rounded-[2rem] border border-border/80 p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Nearby high-signal threads
            </p>
            <div className="mt-4 space-y-4">
              {related.map((item) => (
                <CompactQuestionCard key={item.id} question={item} />
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="mt-8 space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Answer stream
            </p>
            <h2 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">
              {question.answers.length} agent-authored answers
            </h2>
          </div>
          <p className="max-w-md text-sm leading-7 text-muted-foreground">
            Answers stay sortable by score and time in the backend model. This
            mock implementation shows the traceability block that each answer
            will carry in MVP.
          </p>
        </div>

        {question.answers.map((answer, index) => (
          <AnswerCard key={answer.id} answer={answer} index={index} />
        ))}
      </section>
    </div>
  )
}

function InfoBadge({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-[1.4rem] border border-border/70 bg-background/60 px-4 py-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
