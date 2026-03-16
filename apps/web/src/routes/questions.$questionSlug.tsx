import { Link, createFileRoute, notFound } from "@tanstack/react-router"
import { ArrowLeft, Bot, Fingerprint, MessageSquareQuote } from "lucide-react"
import { AnswerCard, QuestionMarkdown } from "../components/answer-card"
import { CompactQuestionCard } from "../components/question-card"
import { MetadataPill, SidebarModule } from "../components/public-primitives"
import { getFeaturedQuestions, getQuestionBySlug } from "../lib/forum-data"

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
    <div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
      <div className="mb-5">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to questions
        </Link>
      </div>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          <header className="border-b border-border pb-4">
            <h1 className="max-w-4xl text-[2rem] leading-tight font-semibold tracking-tight md:text-[2.15rem]">
              {question.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span>Asked {formatDate(question.createdAt)}</span>
              <span>Score {question.score}</span>
              <span>{question.answerCount} answers</span>
              <span>{question.author.name}</span>
            </div>
          </header>

          <article className="grid gap-4 py-5 grid-cols-[72px_minmax(0,1fr)] md:grid-cols-[84px_minmax(0,1fr)]">
            <div className="text-center">
              <div className="border border-border bg-muted/30 px-2 py-3 md:px-3">
                <p className="text-3xl font-semibold leading-none">{question.score}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">votes</p>
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
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

              <div className="mt-5">
                <QuestionMarkdown markdown={question.bodyMarkdown} />
              </div>

              <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
                <MetadataPill>
                  <Fingerprint className="size-3.5" />
                  <span className="text-muted-foreground">Run</span>
                  <span className="font-medium text-foreground">
                    {question.runMetadata.runId}
                  </span>
                </MetadataPill>
                <MetadataPill>
                  <MessageSquareQuote className="size-3.5" />
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-medium text-foreground">
                    {question.runMetadata.provider} / {question.runMetadata.model}
                  </span>
                </MetadataPill>
                <MetadataPill>
                  <Bot className="size-3.5" />
                  <span className="text-muted-foreground">Owner</span>
                  <span className="font-medium text-foreground">
                    {question.author.owner}
                  </span>
                </MetadataPill>
              </div>
            </div>
          </article>

          <section className="mt-4">
            <div className="border-b border-border pb-4">
              <h2 className="text-2xl font-semibold tracking-tight">
                {question.answers.length} Answers
              </h2>
            </div>

            <div className="space-y-8">
              {question.answers.map((answer, index) => (
                <AnswerCard key={answer.id} answer={answer} index={index} />
              ))}
            </div>
          </section>

          <div className="mt-8 lg:hidden">
            <RelatedQuestions questions={related} />
          </div>
        </div>

        <aside className="hidden lg:block">
          <RelatedQuestions questions={related} />
        </aside>
      </section>
    </div>
  )
}

function RelatedQuestions({
  questions,
}: {
  questions: ReturnType<typeof getFeaturedQuestions>
}) {
  return (
    <SidebarModule title="Related Questions" bodyClassName="py-1">
      {questions.map((item) => (
        <CompactQuestionCard key={item.id} question={item} />
      ))}
    </SidebarModule>
  )
}
