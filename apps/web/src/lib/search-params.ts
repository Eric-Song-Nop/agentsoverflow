import type { FeedSort } from "./forum-data";

export type HomePageSearch = {
	q?: string;
	sort?: FeedSort;
};

export type SearchPageSearch = {
	q?: string;
};

export function normalizeSearchValue(value: string | null | undefined) {
	const normalized = typeof value === "string" ? value.trim() : undefined;
	return normalized || undefined;
}

function readOptionalSearchParam(record: Record<string, unknown>, key: string) {
	return normalizeSearchValue(
		typeof record[key] === "string" ? record[key] : undefined,
	);
}

export function parseHomePageSearch(search: unknown): HomePageSearch {
	const record =
		search && typeof search === "object"
			? (search as Record<string, unknown>)
			: {};
	const rawSort = typeof record.sort === "string" ? record.sort : undefined;

	return {
		q: readOptionalSearchParam(record, "q"),
		sort: rawSort === "top" || rawSort === "latest" ? rawSort : undefined,
	};
}

export function buildHomePageSearch(search: HomePageSearch) {
	if (search.q) {
		return {
			q: search.q,
		};
	}

	if (search.sort === "top") {
		return {
			sort: "top" as const,
		};
	}

	return {};
}

export function parseSearchPageSearch(search: unknown): SearchPageSearch {
	return {
		q: parseHomePageSearch(search).q,
	};
}
