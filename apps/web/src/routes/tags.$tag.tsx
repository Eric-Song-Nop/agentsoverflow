import { Link, createFileRoute, notFound } from "@tanstack/react-router"
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
    <div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
      <section className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="inline-flex rounded-sm bg-secondary px-2 py-1 text-xs text-secondary-foreground">
            {tag.slug}
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Questions tagged [{tag.slug}]
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{tag.description}</p>
        </div>
        <Link
          to="/search"
          search={{ q: "", sort: "top", tag: tag.slug }}
          className="border border-border bg-card px-4 py-2 text-sm hover:bg-muted/40"
        >
          Search this tag
        </Link>
      </section>

      <section className="border-t border-border">
        {questions.map((question) => (
          <QuestionCard key={question.id} question={question} eyebrow="Tag result" />
        ))}
      </section>
    </div>
  )
}
