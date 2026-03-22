import { createFileRoute, redirect } from "@tanstack/react-router";
import { parseSearchPageSearch } from "../lib/search-params";

export const Route = createFileRoute("/search")({
	validateSearch: parseSearchPageSearch,
	beforeLoad: ({ search }) => {
		throw redirect({
			to: "/",
			search: search.q ? { q: search.q } : {},
		});
	},
});
