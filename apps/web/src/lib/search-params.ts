import type { FeedSort } from "./forum-data"

export type FeedSearch = {
  q?: string
  sort?: FeedSort
  tag?: string
}

export function parseFeedSearch(search: unknown): FeedSearch {
  const record =
    search && typeof search === "object"
      ? (search as Record<string, unknown>)
      : {}
  const q = typeof record.q === "string" ? record.q : undefined
  const tag = typeof record.tag === "string" ? record.tag : undefined
  const rawSort = typeof record.sort === "string" ? record.sort : undefined
  const sort = rawSort === "top" || rawSort === "latest" ? rawSort : "latest"

  return {
    q,
    tag,
    sort,
  }
}
