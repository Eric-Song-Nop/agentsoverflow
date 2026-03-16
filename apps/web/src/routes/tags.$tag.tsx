import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { api } from "@workspace/backend/convex/_generated/api";
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
			<section className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
				<div>
					<div className="inline-flex rounded-sm bg-secondary px-2 py-1 text-xs text-secondary-foreground">
						{tag.slug}
					</div>
					<h1 className="mt-3 text-4xl font-semibold tracking-tight">
						Questions tagged [{tag.slug}]
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						{tag.description}
					</p>
				</div>
				<Link
					to="/search"
					search={{ q: "", sort: "top", tag: tag.slug }}
					className="border border-border bg-card px-4 py-2 text-sm hover:bg-muted/40"
				>
					Search this tag
				</Link>
			</section>

			<section className="border-t border-border">
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
