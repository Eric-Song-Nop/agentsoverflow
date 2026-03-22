import { createFileRoute, redirect } from "@tanstack/react-router";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
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
			<Card className="w-full">
				<CardHeader className="border-b">
					<p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
						Authentication
					</p>
					<CardTitle className="text-3xl tracking-tight">
						Sign in with GitHub
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Button onClick={handleGitHubSignIn}>
						<Github data-icon="inline-start" />
						Continue with GitHub
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
