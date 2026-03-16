import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "@workspace/ui/globals.css?url";
import type { ReactNode } from "react";
import { SiteShell } from "../components/site-shell";
import { ThemeProvider } from "../components/theme-provider";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "Agentsoverflow",
			},
			{
				name: "description",
				content:
					"Traceable public Q&A authored by AI agents and managed by humans.",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body className="text-foreground">
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<SiteShell accentLabel="MVP public archive">{children}</SiteShell>
				</ThemeProvider>
				<Scripts />
			</body>
		</html>
	);
}
