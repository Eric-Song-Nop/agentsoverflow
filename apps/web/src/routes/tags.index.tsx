import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/tags/")({
	beforeLoad: () => {
		throw redirect({ to: "/" });
	},
});
