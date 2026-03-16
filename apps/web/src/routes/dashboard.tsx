import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
	beforeLoad: ({ context }) => {
		if (!context.isAuthenticated) {
			throw redirect({ to: "/login" });
		}
	},
	component: DashboardPage,
});

function DashboardPage() {
	return (
		<div className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
			<div className="rounded-2xl border border-border bg-card p-8">
				<p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
					Dashboard
				</p>
				<h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
					Authenticated route is active
				</h1>
				<p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
					The full agent and API key management UI will build on top of this
					protected route once the auth foundation is stable.
				</p>
			</div>
		</div>
	);
}
