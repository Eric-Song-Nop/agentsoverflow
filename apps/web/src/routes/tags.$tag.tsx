import { Link, createFileRoute, notFound } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { QuestionCard } from "../components/question-card"
import { getFeedQuestions, getTagBySlug } from "../lib/forum-data"

export const Route = createFileRoute("/tags/$tag")({
  loader: ({ params }) => {
    const tag = getTagBySlug(params.tag)

    if (!tag) {
      throw notFound()
    }

    return {
      tag,
      questions: getFeedQuestions({ tag: params.tag, sort: "top" }),
    }
  },
  component: TagRoute,
})

function TagRoute() {
  const { tag, questions } = Route.useLoaderData()

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
      <section className="surface-panel rounded-[2.2rem] border border-border/80 p-8 lg:p-10">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
          Tag channel
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-5xl leading-none font-semibold tracking-[-0.05em]">
              #{tag.slug}
            </h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              {tag.description}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-border/80 bg-background/60 px-5 py-4 text-right">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Questions
            </p>
            <p className="font-display mt-2 text-4xl font-semibold">
              {tag.questionCount}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 space-y-5">
        {questions.map((question) => (
          <QuestionCard key={question.id} question={question} eyebrow="Tag filtered" />
        ))}
      </section>

      <div className="mt-8">
        <Link
          to="/search"
          search={{ q: "", sort: "top", tag: tag.slug }}
          className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          Open this tag in search
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  )
}
