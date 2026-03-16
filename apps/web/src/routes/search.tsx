import { Link, createFileRoute } from "@tanstack/react-router"
import { Search, SlidersHorizontal } from "lucide-react"
import { QuestionCard } from "../components/question-card"
import { getFeedQuestions, tags } from "../lib/forum-data"
import { parseFeedSearch } from "../lib/search-params"

export const Route = createFileRoute("/search")({
  validateSearch: parseFeedSearch,
  component: SearchRoute,
})

const sortOptions = [
  { value: "latest", label: "Latest first" },
  { value: "top", label: "Highest score" },
] as const

function SearchRoute() {
  const search = Route.useSearch()
  const questions = getFeedQuestions({
    sort: search.sort,
    query: search.q,
    tag: search.tag,
  })

  return (
    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-panel rounded-[2rem] border border-border/80 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Search the archive
          </p>
          <h1 className="mt-3 text-5xl leading-none font-semibold tracking-[-0.05em]">
            Query titles, body text, and tag clusters.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
            MVP search intentionally covers questions only. Answers stay visible
            in context on the detail page, which keeps indexing and ranking
            rules simpler.
          </p>

          <form className="mt-6 space-y-4" action="/search" method="get">
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-muted-foreground">
                Keywords
              </span>
              <div className="flex items-center gap-3 rounded-[1.4rem] border border-border/80 bg-background/70 px-4 py-3">
                <Search className="size-4 text-muted-foreground" />
                <input
                  name="q"
                  defaultValue={search.q ?? ""}
                  placeholder="convex schema, cli output, vote mutation..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Sort
                </span>
                <select
                  name="sort"
                  defaultValue={search.sort ?? "latest"}
                  className="w-full rounded-[1.2rem] border border-border/80 bg-background/70 px-4 py-3 text-sm outline-none"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs uppercase tracking-[0.22em] text-muted-foreground">
                  Tag filter
                </span>
                <select
                  name="tag"
                  defaultValue={search.tag ?? ""}
                  className="w-full rounded-[1.2rem] border border-border/80 bg-background/70 px-4 py-3 text-sm outline-none"
                >
                  <option value="">All tags</option>
                  {tags.map((tag) => (
                    <option key={tag.slug} value={tag.slug}>
                      {tag.slug}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
            >
              <SlidersHorizontal className="size-4" />
              Run search
            </button>
          </form>
        </div>

        <div className="surface-panel rounded-[2rem] border border-border/80 p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Result summary
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <h2 className="text-4xl font-semibold tracking-[-0.05em]">
              {questions.length} matching threads
            </h2>
            {(search.q || search.tag) && (
              <p className="text-sm text-muted-foreground">
                {search.q ? `Query "${search.q}"` : "All questions"}
                {search.tag ? ` in #${search.tag}` : ""}
              </p>
            )}
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {tags.map((tag) => {
              const active = search.tag === tag.slug
              return (
                <Link
                  key={tag.slug}
                  to="/search"
                  search={{
                    q: search.q ?? "",
                    sort: search.sort ?? "latest",
                    tag: active ? "" : tag.slug,
                  }}
                  className={
                    active
                      ? "rounded-full bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                      : "rounded-full border border-border/80 bg-background/70 px-3 py-1.5 text-sm text-foreground hover:bg-secondary"
                  }
                >
                  {tag.slug}
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mt-8 space-y-5">
        {questions.length ? (
          questions.map((question) => (
            <QuestionCard key={question.id} question={question} eyebrow="Search result" />
          ))
        ) : (
          <div className="surface-panel rounded-[2rem] border border-dashed border-border/80 p-10 text-center">
            <h3 className="text-3xl font-semibold tracking-[-0.04em]">
              No threads matched this query.
            </h3>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Try a broader keyword, remove the tag filter, or open the full tag
              index to pivot into nearby topics.
            </p>
            <Link
              to="/tags"
              className="mt-5 inline-flex items-center rounded-full border border-border/80 bg-background/70 px-4 py-2 text-sm font-medium hover:bg-secondary"
            >
              Explore tags instead
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}
