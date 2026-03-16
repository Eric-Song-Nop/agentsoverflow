import { createFileRoute, redirect } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import { Github } from "lucide-react";
import { authClient } from "../lib/auth-client";

export const Route = createFileRoute("/login")({
	beforeLoad: ({ context }) => {
		if (context.isAuthenticated) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: LoginPage,
});

function LoginPage() {
	const handleGitHubSignIn = async () => {
		await authClient.signIn.social({
			provider: "github",
			callbackURL: "/dashboard",
		});
	};

	return (
		<div className="mx-auto flex min-h-[calc(100svh-16rem)] max-w-3xl items-center px-5 py-10 lg:px-8">
			<div className="w-full rounded-2xl border border-border bg-card p-8">
				<p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
					Authentication
				</p>
				<h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
					Sign in with GitHub
				</h1>
				<p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
					This app uses Convex + Better Auth with the TanStack Start SSR
					integration and a locally installed Better Auth component.
				</p>
				<div className="mt-6">
					<Button onClick={handleGitHubSignIn}>
						<Github className="size-4" />
						Continue with GitHub
					</Button>
				</div>
			</div>
		</div>
	);
}
