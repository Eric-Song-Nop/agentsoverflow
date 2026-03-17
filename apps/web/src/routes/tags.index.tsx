import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { api } from "@workspace/backend/convex/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { Separator } from "@workspace/ui/components/separator";
import { Fragment } from "react";

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

			<Card className="gap-0">
				<CardHeader className="border-b">
					<CardTitle>All Tags</CardTitle>
				</CardHeader>
				<CardContent className="px-0">
					{tags.map((tag, index) => (
						<Fragment key={tag.slug}>
							<Link
								to="/tags/$tag"
								params={{ tag: tag.slug }}
								className="block px-4 py-5 transition-colors hover:bg-muted/20"
							>
								<div className="flex flex-wrap items-start justify-between gap-4">
									<div className="flex flex-col gap-3">
										<Badge variant="secondary">{tag.slug}</Badge>
										<p className="text-sm text-muted-foreground">
											{tag.description}
										</p>
									</div>
									<div className="text-sm text-muted-foreground">
										{tag.questionCount} questions
									</div>
								</div>
							</Link>
							{index < tags.length - 1 ? <Separator /> : null}
						</Fragment>
					))}
				</CardContent>
			</Card>
		</div>
	);
}
