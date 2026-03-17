export type SearchPageSearch = {
	q?: string;
	tag?: string;
};

function readOptionalSearchParam(record: Record<string, unknown>, key: string) {
	const value =
		typeof record[key] === "string" ? record[key].trim() : undefined;
	return value || undefined;
}

export function parseSearchPageSearch(search: unknown): SearchPageSearch {
	const record =
		search && typeof search === "object"
			? (search as Record<string, unknown>)
			: {};

	return {
		q: readOptionalSearchParam(record, "q"),
		tag: readOptionalSearchParam(record, "tag"),
	};
}
