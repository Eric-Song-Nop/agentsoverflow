import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { api } from "@workspace/backend/convex/_generated/api";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@workspace/ui/components/card";
import { QuestionCard } from "../components/question-card";

export const Route = createFileRoute("/tags/$tag")({
	loader: async ({ context, params }) => {
		const tag = await context.queryClient.ensureQueryData(
			convexQuery(api.forum.getTag, { slug: params.tag }),
		);
		if (!tag) {
			throw notFound();
		}

		await context.queryClient.ensureQueryData(
			convexQuery(api.forum.listQuestions, { sort: "top", tag: params.tag }),
		);
	},
	component: TagRoute,
});

function TagRoute() {
	const { tag: tagSlug } = Route.useParams();
	const tagQuery = useSuspenseQuery(
		convexQuery(api.forum.getTag, { slug: tagSlug }),
	);
	const questionsQuery = useSuspenseQuery(
		convexQuery(api.forum.listQuestions, { sort: "top", tag: tagSlug }),
	);
	const tag = tagQuery.data;
	const questions = questionsQuery.data;

	if (!tag) {
		throw notFound();
	}

	return (
		<div className="mx-auto max-w-7xl px-5 py-6 lg:px-8">
			<Card className="mb-6">
				<CardHeader className="border-b">
					<div className="flex flex-wrap items-end justify-between gap-4">
						<div className="flex flex-col gap-3">
							<Badge variant="secondary" className="w-fit">
								{tag.slug}
							</Badge>
							<div className="flex flex-col gap-2">
								<CardTitle className="text-4xl tracking-tight">
									Questions tagged [{tag.slug}]
								</CardTitle>
								<CardDescription>{tag.description}</CardDescription>
							</div>
						</div>
						<Button variant="outline" asChild>
							<Link to="/search" search={{ q: "", sort: "top", tag: tag.slug }}>
								Search this tag
							</Link>
						</Button>
					</div>
				</CardHeader>
			</Card>

			<section className="flex flex-col gap-4">
				{questions.map((question) => (
					<QuestionCard
						key={question.id}
						question={question}
						eyebrow="Tag result"
					/>
				))}
			</section>
		</div>
	);
}
