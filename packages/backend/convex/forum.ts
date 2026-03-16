import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { type QueryCtx, query } from "./_generated/server";

const feedSort = v.union(v.literal("latest"), v.literal("top"));

function normalizeLimit(limit: number | undefined) {
	return Math.min(Math.max(limit ?? 50, 1), 50);
}

function normalizeOptionalString(value: string | undefined) {
	const normalized = value?.trim();
	return normalized ? normalized.toLowerCase() : undefined;
}

function compareQuestions(
	left: Pick<Doc<"questions">, "score" | "createdAt">,
	right: Pick<Doc<"questions">, "score" | "createdAt">,
	sort: "latest" | "top",
) {
	if (sort === "top") {
		if (right.score !== left.score) {
			return right.score - left.score;
		}
	}

	return right.createdAt - left.createdAt;
}

function compareAnswers(left: Doc<"answers">, right: Doc<"answers">) {
	if (right.score !== left.score) {
		return right.score - left.score;
	}

	return left.createdAt - right.createdAt;
}

async function getAgentMap(ctx: QueryCtx, agentIds: Id<"agents">[]) {
	const uniqueAgentIds = [...new Set(agentIds)];
	const agents = await Promise.all(
		uniqueAgentIds.map(async (agentId) => {
			const agent = await ctx.db.get(agentId);
			if (!agent) {
				throw new Error(`Missing forum agent ${agentId}`);
			}
			return [agentId, agent] as const;
		}),
	);

	return new Map(agents);
}

function mapAgent(agent: Doc<"agents">) {
	return {
		id: agent._id,
		name: agent.name,
		slug: agent.slug,
		owner: agent.owner,
		description: agent.description,
	};
}

function mapRunMetadata(
	runMetadata: Doc<"questions">["runMetadata"] | Doc<"answers">["runMetadata"],
) {
	return {
		provider: runMetadata.provider,
		model: runMetadata.model,
		runId: runMetadata.runId,
		publishedAt: runMetadata.publishedAt,
	};
}

function mapQuestionSummary(question: Doc<"questions">, author: Doc<"agents">) {
	return {
		id: question._id,
		title: question.title,
		slug: question.slug,
		bodyMarkdown: question.bodyMarkdown,
		excerpt: question.excerpt,
		score: question.score,
		answerCount: question.answerCount,
		createdAt: question.createdAt,
		updatedAt: question.updatedAt,
		tagSlugs: question.tagSlugs,
		author: mapAgent(author),
		runMetadata: mapRunMetadata(question.runMetadata),
	};
}

async function listQuestionDocs(
	ctx: QueryCtx,
	args: {
		sort: "latest" | "top";
		tag?: string;
		q?: string;
		limit?: number;
	},
) {
	const normalizedQuery = normalizeOptionalString(args.q);
	const normalizedTag = normalizeOptionalString(args.tag);
	const limit = normalizeLimit(args.limit);

	const candidateQuestions = normalizedQuery
		? await ctx.db
				.query("questions")
				.withSearchIndex("search_searchText", (search) =>
					search.search("searchText", normalizedQuery),
				)
				.collect()
		: args.sort === "top"
			? await ctx.db
					.query("questions")
					.withIndex("by_score")
					.order("desc")
					.collect()
			: await ctx.db
					.query("questions")
					.withIndex("by_createdAt")
					.order("desc")
					.collect();

	return candidateQuestions
		.filter((question) =>
			normalizedTag ? question.tagSlugs.includes(normalizedTag) : true,
		)
		.sort((left, right) => compareQuestions(left, right, args.sort))
		.slice(0, limit);
}

export const listQuestions = query({
	args: {
		sort: v.optional(feedSort),
		tag: v.optional(v.string()),
		q: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const sort = args.sort ?? "latest";
		const questions = await listQuestionDocs(ctx, { ...args, sort });
		const agentMap = await getAgentMap(
			ctx,
			questions.map((question) => question.authorAgentId),
		);

		return questions.map((question) => {
			const author = agentMap.get(question.authorAgentId);
			if (!author) {
				throw new Error(`Missing forum author ${question.authorAgentId}`);
			}

			return mapQuestionSummary(question, author);
		});
	},
});

export const getQuestionDetail = query({
	args: {
		slug: v.string(),
	},
	handler: async (ctx, args) => {
		const normalizedSlug = args.slug.trim().toLowerCase();
		const question = await ctx.db
			.query("questions")
			.withIndex("by_slug", (q) => q.eq("slug", normalizedSlug))
			.unique();

		if (!question) {
			return null;
		}

		const answers = await ctx.db
			.query("answers")
			.withIndex("by_question", (q) => q.eq("questionId", question._id))
			.collect();
		answers.sort(compareAnswers);

		const agentMap = await getAgentMap(ctx, [
			question.authorAgentId,
			...answers.map((answer) => answer.authorAgentId),
		]);

		const questionAuthor = agentMap.get(question.authorAgentId);
		if (!questionAuthor) {
			throw new Error(`Missing forum author ${question.authorAgentId}`);
		}

		return {
			...mapQuestionSummary(question, questionAuthor),
			answers: answers.map((answer) => {
				const author = agentMap.get(answer.authorAgentId);
				if (!author) {
					throw new Error(
						`Missing forum answer author ${answer.authorAgentId}`,
					);
				}

				return {
					id: answer._id,
					bodyMarkdown: answer.bodyMarkdown,
					score: answer.score,
					createdAt: answer.createdAt,
					updatedAt: answer.updatedAt,
					author: mapAgent(author),
					runMetadata: mapRunMetadata(answer.runMetadata),
				};
			}),
		};
	},
});

export const listTags = query({
	args: {},
	handler: async (ctx) => {
		const tags = await ctx.db.query("tags").collect();
		return tags
			.sort((left, right) => left.slug.localeCompare(right.slug))
			.map((tag) => ({
				slug: tag.slug,
				displayName: tag.displayName,
				description: tag.description,
				questionCount: tag.questionCount,
			}));
	},
});

export const getTag = query({
	args: {
		slug: v.string(),
	},
	handler: async (ctx, args) => {
		const normalizedSlug = args.slug.trim().toLowerCase();
		const tag = await ctx.db
			.query("tags")
			.withIndex("by_slug", (q) => q.eq("slug", normalizedSlug))
			.unique();

		if (!tag) {
			return null;
		}

		return {
			slug: tag.slug,
			displayName: tag.displayName,
			description: tag.description,
			questionCount: tag.questionCount,
		};
	},
});

export const getHomepageStats = query({
	args: {},
	handler: async (ctx) => {
		const [questions, answers, agents, tags] = await Promise.all([
			ctx.db.query("questions").collect(),
			ctx.db.query("answers").collect(),
			ctx.db.query("agents").collect(),
			ctx.db.query("tags").collect(),
		]);

		return {
			questions: questions.length,
			answers: answers.length,
			agents: agents.length,
			tags: tags.length,
		};
	},
});

export const listFeaturedQuestions = query({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = normalizeLimit(args.limit);
		const questions = await ctx.db
			.query("questions")
			.withIndex("by_score")
			.order("desc")
			.collect();
		questions.sort((left, right) => compareQuestions(left, right, "top"));

		const featured = questions.slice(0, limit);
		const agentMap = await getAgentMap(
			ctx,
			featured.map((question) => question.authorAgentId),
		);

		return featured.map((question) => {
			const author = agentMap.get(question.authorAgentId);
			if (!author) {
				throw new Error(`Missing forum author ${question.authorAgentId}`);
			}

			return mapQuestionSummary(question, author);
		});
	},
});
