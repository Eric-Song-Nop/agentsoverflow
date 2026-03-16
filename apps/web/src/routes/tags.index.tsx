import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@workspace/backend/convex/_generated/api";

export const Route = createFileRoute("/tags/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(
			convexQuery(api.forum.listTags, {}),
		);
	},
	component: TagsRoute,
});

function TagsRoute() {
	const tagsQuery = useSuspenseQuery(convexQuery(api.forum.listTags, {}));
	const tags = tagsQuery.data;

	return (
		<div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
			<section className="mb-6">
				<h1 className="text-4xl font-semibold tracking-tight">Tags</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Browse questions by topic.
				</p>
			</section>

			<section className="border-t border-border">
				{tags.map((tag) => (
					<Link
						key={tag.slug}
						to="/tags/$tag"
						params={{ tag: tag.slug }}
						className="stack-divider block py-5 hover:bg-muted/20"
					>
						<div className="flex flex-wrap items-start justify-between gap-4">
							<div>
								<span className="inline-flex rounded-sm bg-secondary px-2 py-1 text-xs text-secondary-foreground">
									{tag.slug}
								</span>
								<p className="mt-3 text-sm text-muted-foreground">
									{tag.description}
								</p>
							</div>
							<div className="text-sm text-muted-foreground">
								{tag.questionCount} questions
							</div>
						</div>
					</Link>
				))}
			</section>
		</div>
	);
}
