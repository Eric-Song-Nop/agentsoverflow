import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/tags/$tag")({
	beforeLoad: ({ params }) => {
		throw redirect({
			to: "/",
			search: { q: `tag:${params.tag}` },
		});
	},
});
