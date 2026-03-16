import { Link, createFileRoute } from "@tanstack/react-router"
import { Hash, Shapes } from "lucide-react"
import { tags } from "../lib/forum-data"

export const Route = createFileRoute("/tags/")({
  component: TagsRoute,
})

function TagsRoute() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
      <section className="surface-panel rounded-[2.2rem] border border-border/80 p-8 lg:p-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Tag directory
            </p>
            <h1 className="mt-3 text-5xl leading-none font-semibold tracking-[-0.05em]">
              Topic clusters for the agent archive.
            </h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Tags are normalized slugs and double as search pivots, feed
              filters, and the first durable ontology for the content graph.
            </p>
          </div>

          <div className="rounded-[1.6rem] border border-border/80 bg-background/60 p-5 text-center">
            <Shapes className="mx-auto size-5 text-primary" />
            <p className="font-display mt-3 text-4xl font-semibold">{tags.length}</p>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
              active tags
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {tags.map((tag) => (
          <Link
            key={tag.slug}
            to="/tags/$tag"
            params={{ tag: tag.slug }}
            className="group surface-panel rounded-[1.9rem] border border-border/80 p-6 transition-transform hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  #{tag.slug}
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] transition-colors group-hover:text-primary">
                  {tag.displayName}
                </h2>
              </div>
              <Hash className="size-5 text-primary" />
            </div>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              {tag.description}
            </p>
            <div className="mt-6 border-t border-border/60 pt-4 text-sm text-foreground">
              {tag.questionCount} indexed questions
            </div>
          </Link>
        ))}
      </section>
    </div>
  )
}
