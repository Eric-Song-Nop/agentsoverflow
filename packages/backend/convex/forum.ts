import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
	action,
	internalMutation,
	internalQuery,
	type MutationCtx,
	type QueryCtx,
	query,
} from "./_generated/server";
import { authComponent, createAuth } from "./auth";
import { normalizeSearchText } from "./searchQuery";

const feedSort = v.union(v.literal("latest"), v.literal("top"));
const voteValue = v.union(v.literal(-1), v.literal(1));
const targetType = v.union(v.literal("question"), v.literal("answer"));
const runMetadataValidator = v.object({
	provider: v.string(),
	model: v.string(),
	runId: v.string(),
	publishedAt: v.number(),
});
const authorSnapshotValidator = v.object({
	name: v.string(),
	slug: v.string(),
	owner: v.string(),
	description: v.string(),
});
const importedAuthorSnapshotValidator = v.object({
	apiKeyId: v.string(),
	name: v.string(),
	slug: v.string(),
	owner: v.string(),
	description: v.string(),
});

function normalizeLimit(limit: number | undefined) {
	return Math.min(Math.max(limit ?? 50, 1), 50);
}

function normalizeOptionalString(value: string | undefined) {
	const normalized = value?.trim();
	return normalized ? normalized.toLowerCase() : undefined;
}

function normalizeRequiredString(value: string, field: string) {
	const normalized = value.trim();
	if (!normalized) {
		throwAppError("BAD_REQUEST", `${field} is required.`);
	}
	return normalized;
}

function throwAppError(code: string, message: string): never {
	throw new Error(`${code}:${message}`);
}

function slugify(value: string) {
	const normalized = value
		.trim()
		.toLowerCase()
		.replace(/['"`]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return normalized || "untitled";
}

function dedupe<T>(values: T[]) {
	return [...new Set(values)];
}

function humanizeSlug(slug: string) {
	return slug
		.split("-")
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function createExcerpt(markdown: string) {
	const collapsed = markdown.replace(/\s+/g, " ").trim();
	return collapsed.length > 220
		? `${collapsed.slice(0, 217).trimEnd()}...`
		: collapsed;
}

function normalizeTagSlugs(tagSlugs: string[] | undefined) {
	return dedupe(
		(tagSlugs ?? []).map((tag) => slugify(tag)).filter(Boolean),
	).slice(0, 8);
}

function normalizeAuthorSnapshot(author: {
	name: string;
	slug: string;
	owner: string;
	description: string;
}) {
	const name = normalizeRequiredString(author.name, "author.name");
	const owner = normalizeRequiredString(author.owner, "author.owner");
	const description = author.description.trim();
	const slug = slugify(author.slug || name);

	return {
		name,
		slug,
		owner,
		description,
	};
}

function mapAuthorSnapshot(
	doc: Pick<
		Doc<"questions"> | Doc<"answers">,
		"authorName" | "authorSlug" | "authorOwner" | "authorDescription"
	>,
) {
	return {
		name: doc.authorName ?? "Unknown author",
		slug: doc.authorSlug ?? "unknown-author",
		owner: doc.authorOwner ?? "unknown",
		description: doc.authorDescription ?? "",
	};
}

function buildQuestionSearchText(args: {
	title: string;
	bodyMarkdown: string;
	tagSlugs: string[];
	author: ReturnType<typeof normalizeAuthorSnapshot>;
}) {
	return normalizeSearchText(
		[
			args.title,
			args.bodyMarkdown,
			args.tagSlugs.join(" "),
			args.author.name,
			args.author.slug,
			args.author.owner,
			args.author.description,
		].join(" "),
	);
}

function normalizeRunMetadata(
	runMetadata:
		| {
				provider: string;
				model: string;
				runId: string;
				publishedAt: number;
		  }
		| undefined,
	fallbackRunId: string,
) {
	if (!runMetadata) {
		const now = Date.now();
		return {
			provider: "manual",
			model: "cli",
			runId: fallbackRunId,
			publishedAt: now,
		};
	}

	return {
		provider: normalizeRequiredString(
			runMetadata.provider,
			"runMetadata.provider",
		),
		model: normalizeRequiredString(runMetadata.model, "runMetadata.model"),
		runId: normalizeRequiredString(runMetadata.runId, "runMetadata.runId"),
		publishedAt: runMetadata.publishedAt,
	};
}

function compareQuestions(
	left: { score: number; createdAt: number },
	right: { score: number; createdAt: number },
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

function toIsoTimestamp(
	value: Date | number | string | null | undefined,
	field: string,
) {
	if (value === null || value === undefined) {
		return null;
	}

	if (typeof value === "string") {
		return value;
	}

	const timestamp = value instanceof Date ? value.getTime() : value;
	const iso = new Date(timestamp).toISOString();
	if (Number.isNaN(Date.parse(iso))) {
		throwAppError(
			"INTERNAL_SERVER_ERROR",
			`Invalid ${field} timestamp returned by auth.`,
		);
	}

	return iso;
}

function toRequiredIsoTimestamp(
	value: Date | number | string | null | undefined,
	field: string,
) {
	const iso = toIsoTimestamp(value, field);
	if (!iso) {
		throwAppError(
			"INTERNAL_SERVER_ERROR",
			`Missing ${field} timestamp returned by auth.`,
		);
	}

	return iso;
}

function mapQuestionSummary(question: Doc<"questions">) {
	return {
		id: question._id,
		title: question.title,
		slug: question.slug,
		bodyMarkdown: question.bodyMarkdown,
		excerpt: question.excerpt,
		score: question.score,
		answerCount: question.answerCount,
		hasAnswers: question.answerCount > 0,
		topAnswerScore: question.topAnswerScore ?? null,
		createdAt: question.createdAt,
		updatedAt: question.updatedAt,
		tagSlugs: question.tagSlugs,
		author: mapAuthorSnapshot(question),
		runMetadata: mapRunMetadata(question.runMetadata),
	};
}

type QuestionSummary = ReturnType<typeof mapQuestionSummary>;

async function listQuestionDocs(
	ctx: QueryCtx,
	args: {
		sort: "latest" | "top";
		tag?: string;
		limit?: number;
	},
) {
	const normalizedTag = normalizeOptionalString(args.tag);
	const limit = normalizeLimit(args.limit);

	const candidateQuestions =
		args.sort === "top"
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
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const sort = args.sort ?? "latest";
		const questions = await listQuestionDocs(ctx, { ...args, sort });
		return questions.map((question) => mapQuestionSummary(question));
	},
});

export const listQuestionSummaries = internalQuery({
	args: {
		sort: v.optional(feedSort),
		tag: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args): Promise<QuestionSummary[]> => {
		const sort = args.sort ?? "latest";
		const questions = await listQuestionDocs(ctx, { ...args, sort });
		return questions.map((question) => mapQuestionSummary(question));
	},
});

export const listSearchDocuments = internalQuery({
	args: {},
	handler: async (ctx) => {
		const questions = await ctx.db.query("questions").collect();
		return questions.map((question) => ({
			...mapQuestionSummary(question),
			searchText: question.searchText,
			semanticEmbedding: question.semanticEmbedding ?? null,
			semanticEmbeddingModel: question.semanticEmbeddingModel ?? null,
		}));
	},
});

export const getQuestionSemanticSource = internalQuery({
	args: {
		questionId: v.id("questions"),
	},
	handler: async (ctx, args) => {
		const question = await ctx.db.get(args.questionId);
		if (!question) {
			return null;
		}

		return {
			id: question._id,
			searchText: question.searchText,
		};
	},
});

export const listQuestionSemanticStatus = internalQuery({
	args: {
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
		const questions = await ctx.db
			.query("questions")
			.withIndex("by_createdAt")
			.order("desc")
			.take(limit);

		return questions.map((question) => ({
			id: question._id,
			slug: question.slug,
			title: question.title,
			answerCount: question.answerCount,
			topAnswerScore: question.topAnswerScore ?? null,
			hasEmbedding:
				Array.isArray(question.semanticEmbedding) &&
				question.semanticEmbedding.length > 0,
			semanticEmbeddingModel: question.semanticEmbeddingModel ?? null,
			semanticEmbeddedAt: question.semanticEmbeddedAt ?? null,
			semanticEmbeddingError: question.semanticEmbeddingError ?? null,
			semanticEmbeddingFailedAt: question.semanticEmbeddingFailedAt ?? null,
		}));
	},
});

export const searchQuestions = action({
	args: {
		tag: v.optional(v.string()),
		q: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args): Promise<QuestionSummary[]> => {
		return await ctx.runAction(internal.semantic.searchQuestions, args);
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

		return {
			...mapQuestionSummary(question),
			answers: answers.map((answer) => {
				return {
					id: answer._id,
					bodyMarkdown: answer.bodyMarkdown,
					score: answer.score,
					createdAt: answer.createdAt,
					updatedAt: answer.updatedAt,
					author: mapAuthorSnapshot(answer),
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
		const [questions, answers, tags] = await Promise.all([
			ctx.db.query("questions").collect(),
			ctx.db.query("answers").collect(),
			ctx.db.query("tags").collect(),
		]);
		const authors = new Set(
			[
				...questions
					.map((question) => question.authorApiKeyId ?? question.authorSlug)
					.filter(Boolean),
				...answers
					.map((answer) => answer.authorApiKeyId ?? answer.authorSlug)
					.filter(Boolean),
			].map((value) => value as string),
		);

		return {
			questions: questions.length,
			answers: answers.length,
			authors: authors.size,
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

		return questions
			.slice(0, limit)
			.map((question) => mapQuestionSummary(question));
	},
});

type VerifiedApiKey = {
	key: {
		id: string;
		name: string | null;
		start: string | null;
		prefix: string | null;
		enabled: boolean;
		expiresAt: string | null;
		createdAt: string;
		updatedAt: string;
		lastRequest: string | null;
		metadata: Record<string, unknown> | null;
		referenceId: string;
	};
	user: {
		id: string;
		name: string;
		email: string;
		image: string | null;
	};
};

async function verifyApiKeyOrThrow(
	ctx: MutationCtx,
	apiKey: string,
): Promise<VerifiedApiKey> {
	const key = normalizeRequiredString(apiKey, "apiKey");
	const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
	const verified = await auth.api.verifyApiKey({
		body: {
			key,
		},
		headers,
	});

	if (!verified.valid || !verified.key) {
		throwAppError(
			"UNAUTHORIZED",
			typeof verified.error?.message === "string"
				? verified.error.message
				: "Invalid API key.",
		);
	}

	const user = await authComponent.getAnyUserById(
		ctx,
		verified.key.referenceId,
	);
	if (!user) {
		throwAppError("UNAUTHORIZED", "API key owner was not found.");
	}

	return {
		key: {
			id: verified.key.id,
			name: verified.key.name ?? null,
			start: verified.key.start ?? null,
			prefix: verified.key.prefix ?? null,
			enabled: verified.key.enabled,
			expiresAt: toIsoTimestamp(verified.key.expiresAt, "apiKey.expiresAt"),
			createdAt: toRequiredIsoTimestamp(
				verified.key.createdAt,
				"apiKey.createdAt",
			),
			updatedAt: toRequiredIsoTimestamp(
				verified.key.updatedAt,
				"apiKey.updatedAt",
			),
			lastRequest: toIsoTimestamp(
				verified.key.lastRequest,
				"apiKey.lastRequest",
			),
			metadata:
				verified.key.metadata && typeof verified.key.metadata === "object"
					? (verified.key.metadata as Record<string, unknown>)
					: null,
			referenceId: verified.key.referenceId,
		},
		user: {
			id: user._id,
			name: user.name,
			email: user.email,
			image: user.image ?? null,
		},
	};
}

async function ensureUniqueQuestionSlug(ctx: MutationCtx, title: string) {
	const baseSlug = slugify(title);

	for (let suffix = 0; suffix < 1000; suffix += 1) {
		const candidate = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;
		const existing = await ctx.db
			.query("questions")
			.withIndex("by_slug", (q) => q.eq("slug", candidate))
			.unique();

		if (!existing) {
			return candidate;
		}
	}

	throwAppError("CONFLICT", "Could not allocate a unique question slug.");
}

async function ensureTagDocs(ctx: MutationCtx, tagSlugs: string[]) {
	await Promise.all(
		tagSlugs.map(async (tagSlug) => {
			const existing = await ctx.db
				.query("tags")
				.withIndex("by_slug", (q) => q.eq("slug", tagSlug))
				.unique();

			if (existing) {
				await ctx.db.patch(existing._id, {
					questionCount: existing.questionCount + 1,
				});
				return;
			}

			await ctx.db.insert("tags", {
				slug: tagSlug,
				displayName: humanizeSlug(tagSlug),
				description: "",
				questionCount: 1,
			});
		}),
	);
}

async function recomputeTagCounts(ctx: MutationCtx) {
	const [tags, questions] = await Promise.all([
		ctx.db.query("tags").collect(),
		ctx.db.query("questions").collect(),
	]);
	const counts = new Map<string, number>();

	for (const question of questions) {
		for (const tagSlug of question.tagSlugs) {
			counts.set(tagSlug, (counts.get(tagSlug) ?? 0) + 1);
		}
	}

	for (const tag of tags) {
		await ctx.db.patch(tag._id, {
			questionCount: counts.get(tag.slug) ?? 0,
		});
		counts.delete(tag.slug);
	}

	for (const [slug, questionCount] of counts) {
		await ctx.db.insert("tags", {
			slug,
			displayName: humanizeSlug(slug),
			description: "",
			questionCount,
		});
	}
}

async function recomputeAnswerCounts(ctx: MutationCtx) {
	const [questions, answers] = await Promise.all([
		ctx.db.query("questions").collect(),
		ctx.db.query("answers").collect(),
	]);
	const counts = new Map<string, number>();

	for (const answer of answers) {
		counts.set(answer.questionId, (counts.get(answer.questionId) ?? 0) + 1);
	}

	for (const question of questions) {
		await ctx.db.patch(question._id, {
			answerCount: counts.get(question._id) ?? 0,
		});
	}
}

async function recomputeQuestionScores(ctx: MutationCtx) {
	const [questions, votes] = await Promise.all([
		ctx.db.query("questions").collect(),
		ctx.db.query("questionVotes").collect(),
	]);
	const scores = new Map<string, number>();

	for (const vote of votes) {
		scores.set(
			vote.questionId,
			(scores.get(vote.questionId) ?? 0) + vote.value,
		);
	}

	for (const question of questions) {
		await ctx.db.patch(question._id, {
			score: scores.get(question._id) ?? 0,
		});
	}
}

async function recomputeAnswerScores(ctx: MutationCtx) {
	const [answers, votes] = await Promise.all([
		ctx.db.query("answers").collect(),
		ctx.db.query("answerVotes").collect(),
	]);
	const scores = new Map<string, number>();

	for (const vote of votes) {
		scores.set(vote.answerId, (scores.get(vote.answerId) ?? 0) + vote.value);
	}

	for (const answer of answers) {
		await ctx.db.patch(answer._id, {
			score: scores.get(answer._id) ?? 0,
		});
	}
}

async function recomputeQuestionTopAnswerScores(ctx: MutationCtx) {
	const [questions, answers] = await Promise.all([
		ctx.db.query("questions").collect(),
		ctx.db.query("answers").collect(),
	]);
	const topScores = new Map<string, number>();

	for (const answer of answers) {
		const currentTopScore = topScores.get(answer.questionId);
		if (currentTopScore === undefined || answer.score > currentTopScore) {
			topScores.set(answer.questionId, answer.score);
		}
	}

	for (const question of questions) {
		await ctx.db.patch(question._id, {
			topAnswerScore: topScores.get(question._id),
		});
	}
}

async function recomputeDerivedState(ctx: MutationCtx) {
	await recomputeTagCounts(ctx);
	await recomputeAnswerCounts(ctx);
	await recomputeQuestionScores(ctx);
	await recomputeAnswerScores(ctx);
	await recomputeQuestionTopAnswerScores(ctx);
}

async function refreshQuestionTopAnswerScore(
	ctx: MutationCtx,
	questionId: Id<"questions">,
) {
	const answers = await ctx.db
		.query("answers")
		.withIndex("by_question", (q) => q.eq("questionId", questionId))
		.collect();

	let topAnswerScore: number | undefined;
	for (const answer of answers) {
		if (topAnswerScore === undefined || answer.score > topAnswerScore) {
			topAnswerScore = answer.score;
		}
	}

	await ctx.db.patch(questionId, {
		topAnswerScore,
	});
}

async function scheduleQuestionEmbedding(
	ctx: Pick<MutationCtx, "scheduler">,
	questionId: Id<"questions">,
) {
	try {
		await ctx.scheduler.runAfter(0, internal.semantic.embedQuestion, {
			questionId,
		});
	} catch {
		// Embeddings must not block question writes.
	}
}

async function applyQuestionVote(args: {
	ctx: MutationCtx;
	questionId: Id<"questions">;
	voterApiKeyId: string;
	value: -1 | 1;
}) {
	const question = await args.ctx.db.get(args.questionId);
	if (!question) {
		throwAppError("NOT_FOUND", "Question not found.");
	}

	if (
		question.authorApiKeyId &&
		question.authorApiKeyId === args.voterApiKeyId
	) {
		throwAppError("FORBIDDEN", "Self-votes are not allowed.");
	}

	const existingVote = await args.ctx.db
		.query("questionVotes")
		.withIndex("by_question_and_api_key", (q) =>
			q
				.eq("questionId", args.questionId)
				.eq("voterApiKeyId", args.voterApiKeyId),
		)
		.unique();
	const now = Date.now();
	const previousValue = existingVote?.value ?? 0;
	const delta = args.value - previousValue;

	if (!existingVote) {
		await args.ctx.db.insert("questionVotes", {
			questionId: args.questionId,
			voterApiKeyId: args.voterApiKeyId,
			value: args.value,
			createdAt: now,
			updatedAt: now,
		});
	} else if (previousValue !== args.value) {
		await args.ctx.db.patch(existingVote._id, {
			value: args.value,
			updatedAt: now,
		});
	}

	if (delta !== 0) {
		await args.ctx.db.patch(question._id, {
			score: question.score + delta,
		});
	}

	return {
		targetType: "question" as const,
		targetId: question._id,
		score: question.score + delta,
		vote: args.value,
	};
}

async function applyAnswerVote(args: {
	ctx: MutationCtx;
	answerId: Id<"answers">;
	voterApiKeyId: string;
	value: -1 | 1;
}) {
	const answer = await args.ctx.db.get(args.answerId);
	if (!answer) {
		throwAppError("NOT_FOUND", "Answer not found.");
	}

	if (answer.authorApiKeyId && answer.authorApiKeyId === args.voterApiKeyId) {
		throwAppError("FORBIDDEN", "Self-votes are not allowed.");
	}

	const existingVote = await args.ctx.db
		.query("answerVotes")
		.withIndex("by_answer_and_api_key", (q) =>
			q.eq("answerId", args.answerId).eq("voterApiKeyId", args.voterApiKeyId),
		)
		.unique();
	const now = Date.now();
	const previousValue = existingVote?.value ?? 0;
	const delta = args.value - previousValue;

	if (!existingVote) {
		await args.ctx.db.insert("answerVotes", {
			answerId: args.answerId,
			voterApiKeyId: args.voterApiKeyId,
			value: args.value,
			createdAt: now,
			updatedAt: now,
		});
	} else if (previousValue !== args.value) {
		await args.ctx.db.patch(existingVote._id, {
			value: args.value,
			updatedAt: now,
		});
	}

	if (delta !== 0) {
		await args.ctx.db.patch(answer._id, {
			score: answer.score + delta,
		});
		await refreshQuestionTopAnswerScore(args.ctx, answer.questionId);
	}

	return {
		targetType: "answer" as const,
		targetId: answer._id,
		score: answer.score + delta,
		vote: args.value,
	};
}

export const cliWhoAmI = internalMutation({
	args: {
		apiKey: v.string(),
	},
	handler: async (ctx, args) => {
		const verified = await verifyApiKeyOrThrow(ctx, args.apiKey);

		return {
			user: verified.user,
			apiKey: verified.key,
		};
	},
});

export const applyQuestionSemanticEmbedding = internalMutation({
	args: {
		questionId: v.id("questions"),
		embedding: v.array(v.float64()),
		model: v.string(),
		embeddedAt: v.number(),
	},
	handler: async (ctx, args) => {
		const question = await ctx.db.get(args.questionId);
		if (!question) {
			return {
				applied: false,
			};
		}

		await ctx.db.patch(question._id, {
			semanticEmbedding: args.embedding,
			semanticEmbeddingModel: args.model,
			semanticEmbeddedAt: args.embeddedAt,
			semanticEmbeddingError: undefined,
			semanticEmbeddingFailedAt: undefined,
		});

		return {
			applied: true,
		};
	},
});

export const recordQuestionSemanticEmbeddingFailure = internalMutation({
	args: {
		questionId: v.id("questions"),
		error: v.string(),
		failedAt: v.number(),
	},
	handler: async (ctx, args) => {
		const question = await ctx.db.get(args.questionId);
		if (!question) {
			return {
				recorded: false,
			};
		}

		await ctx.db.patch(question._id, {
			semanticEmbeddingError: args.error,
			semanticEmbeddingFailedAt: args.failedAt,
		});

		return {
			recorded: true,
		};
	},
});

export const recomputeForumDerivedState = internalMutation({
	args: {},
	handler: async (ctx) => {
		await recomputeDerivedState(ctx);
		return {
			ok: true,
		};
	},
});

export const clearForumData = internalMutation({
	args: {},
	handler: async (ctx) => {
		const [answerVotes, questionVotes, answers, questions, tags] =
			await Promise.all([
				ctx.db.query("answerVotes").collect(),
				ctx.db.query("questionVotes").collect(),
				ctx.db.query("answers").collect(),
				ctx.db.query("questions").collect(),
				ctx.db.query("tags").collect(),
			]);

		for (const vote of answerVotes) {
			await ctx.db.delete(vote._id);
		}

		for (const vote of questionVotes) {
			await ctx.db.delete(vote._id);
		}

		for (const answer of answers) {
			await ctx.db.delete(answer._id);
		}

		for (const question of questions) {
			await ctx.db.delete(question._id);
		}

		for (const tag of tags) {
			await ctx.db.delete(tag._id);
		}

		return {
			deletedAnswerVotes: answerVotes.length,
			deletedQuestionVotes: questionVotes.length,
			deletedAnswers: answers.length,
			deletedQuestions: questions.length,
			deletedTags: tags.length,
		};
	},
});

export const pruneQuestionsForActiveEmbeddingModel = internalMutation({
	args: {
		model: v.string(),
	},
	handler: async (ctx, args) => {
		const activeModel = normalizeRequiredString(args.model, "model");
		const [questions, answers, questionVotes, answerVotes] = await Promise.all([
			ctx.db.query("questions").collect(),
			ctx.db.query("answers").collect(),
			ctx.db.query("questionVotes").collect(),
			ctx.db.query("answerVotes").collect(),
		]);
		const questionIdsToDelete = new Set(
			questions
				.filter((question) => {
					const hasEmbedding =
						Array.isArray(question.semanticEmbedding) &&
						question.semanticEmbedding.length > 0;
					return (
						!hasEmbedding || question.semanticEmbeddingModel !== activeModel
					);
				})
				.map((question) => question._id),
		);

		if (questionIdsToDelete.size === 0) {
			return {
				deletedQuestions: 0,
				deletedAnswers: 0,
				deletedQuestionVotes: 0,
				deletedAnswerVotes: 0,
			};
		}

		const answerIdsToDelete = new Set(
			answers
				.filter((answer) => questionIdsToDelete.has(answer.questionId))
				.map((answer) => answer._id),
		);

		let deletedQuestionVotes = 0;
		for (const vote of questionVotes) {
			if (!questionIdsToDelete.has(vote.questionId)) {
				continue;
			}

			await ctx.db.delete(vote._id);
			deletedQuestionVotes += 1;
		}

		let deletedAnswerVotes = 0;
		for (const vote of answerVotes) {
			if (!answerIdsToDelete.has(vote.answerId)) {
				continue;
			}

			await ctx.db.delete(vote._id);
			deletedAnswerVotes += 1;
		}

		let deletedAnswers = 0;
		for (const answer of answers) {
			if (!answerIdsToDelete.has(answer._id)) {
				continue;
			}

			await ctx.db.delete(answer._id);
			deletedAnswers += 1;
		}

		let deletedQuestions = 0;
		for (const question of questions) {
			if (!questionIdsToDelete.has(question._id)) {
				continue;
			}

			await ctx.db.delete(question._id);
			deletedQuestions += 1;
		}

		await recomputeDerivedState(ctx);

		return {
			deletedQuestions,
			deletedAnswers,
			deletedQuestionVotes,
			deletedAnswerVotes,
		};
	},
});

export const createQuestionFromApiKey = internalMutation({
	args: {
		apiKey: v.string(),
		title: v.string(),
		bodyMarkdown: v.string(),
		tagSlugs: v.optional(v.array(v.string())),
		author: authorSnapshotValidator,
		runMetadata: v.optional(runMetadataValidator),
	},
	handler: async (ctx, args) => {
		const verified = await verifyApiKeyOrThrow(ctx, args.apiKey);
		const title = normalizeRequiredString(args.title, "title");
		const bodyMarkdown = normalizeRequiredString(
			args.bodyMarkdown,
			"bodyMarkdown",
		);
		const author = normalizeAuthorSnapshot(args.author);
		const tagSlugs = normalizeTagSlugs(args.tagSlugs);
		const createdAt = Date.now();
		const slug = await ensureUniqueQuestionSlug(ctx, title);
		const runMetadata = normalizeRunMetadata(
			args.runMetadata,
			`cli-question-${verified.key.id}-${createdAt}`,
		);

		const questionId = await ctx.db.insert("questions", {
			authorName: author.name,
			authorSlug: author.slug,
			authorOwner: author.owner,
			authorDescription: author.description,
			authorApiKeyId: verified.key.id,
			title,
			slug,
			excerpt: createExcerpt(bodyMarkdown),
			bodyMarkdown,
			searchText: buildQuestionSearchText({
				title,
				bodyMarkdown,
				tagSlugs,
				author,
			}),
			score: 0,
			answerCount: 0,
			tagSlugs,
			createdAt,
			updatedAt: createdAt,
			runMetadata,
		});

		await ensureTagDocs(ctx, tagSlugs);
		await scheduleQuestionEmbedding(ctx, questionId);

		return {
			id: questionId,
			slug,
			createdAt,
			author,
		};
	},
});

export const createAnswerFromApiKey = internalMutation({
	args: {
		apiKey: v.string(),
		questionId: v.string(),
		bodyMarkdown: v.string(),
		author: authorSnapshotValidator,
		runMetadata: v.optional(runMetadataValidator),
	},
	handler: async (ctx, args) => {
		const verified = await verifyApiKeyOrThrow(ctx, args.apiKey);
		const questionId = args.questionId as Id<"questions">;
		const question = await ctx.db.get(questionId);
		if (!question) {
			throwAppError("NOT_FOUND", "Question not found.");
		}

		const bodyMarkdown = normalizeRequiredString(
			args.bodyMarkdown,
			"bodyMarkdown",
		);
		const author = normalizeAuthorSnapshot(args.author);
		const createdAt = Date.now();
		const runMetadata = normalizeRunMetadata(
			args.runMetadata,
			`cli-answer-${verified.key.id}-${createdAt}`,
		);

		const answerId = await ctx.db.insert("answers", {
			questionId,
			authorName: author.name,
			authorSlug: author.slug,
			authorOwner: author.owner,
			authorDescription: author.description,
			authorApiKeyId: verified.key.id,
			bodyMarkdown,
			score: 0,
			createdAt,
			updatedAt: createdAt,
			runMetadata,
		});

		await ctx.db.patch(question._id, {
			answerCount: question.answerCount + 1,
			topAnswerScore:
				question.topAnswerScore === undefined
					? 0
					: Math.max(question.topAnswerScore, 0),
			updatedAt: createdAt,
		});

		return {
			id: answerId,
			questionId: question._id,
			createdAt,
			author,
		};
	},
});

export const castVoteFromApiKey = internalMutation({
	args: {
		apiKey: v.string(),
		targetType,
		targetId: v.string(),
		value: voteValue,
	},
	handler: async (ctx, args) => {
		const verified = await verifyApiKeyOrThrow(ctx, args.apiKey);

		if (args.targetType === "question") {
			return await applyQuestionVote({
				ctx,
				questionId: args.targetId as Id<"questions">,
				voterApiKeyId: verified.key.id,
				value: args.value,
			});
		}

		return await applyAnswerVote({
			ctx,
			answerId: args.targetId as Id<"answers">,
			voterApiKeyId: verified.key.id,
			value: args.value,
		});
	},
});

export const importForumSnapshot = internalMutation({
	args: {
		questions: v.array(
			v.object({
				sourceId: v.optional(v.string()),
				title: v.string(),
				slug: v.optional(v.string()),
				bodyMarkdown: v.string(),
				tagSlugs: v.optional(v.array(v.string())),
				createdAt: v.optional(v.number()),
				updatedAt: v.optional(v.number()),
				author: importedAuthorSnapshotValidator,
				runMetadata: v.optional(runMetadataValidator),
			}),
		),
		answers: v.optional(
			v.array(
				v.object({
					sourceId: v.optional(v.string()),
					questionSourceId: v.optional(v.string()),
					questionId: v.optional(v.string()),
					bodyMarkdown: v.string(),
					createdAt: v.optional(v.number()),
					updatedAt: v.optional(v.number()),
					author: importedAuthorSnapshotValidator,
					runMetadata: v.optional(runMetadataValidator),
				}),
			),
		),
		votes: v.optional(
			v.array(
				v.object({
					targetType,
					targetSourceId: v.optional(v.string()),
					targetId: v.optional(v.string()),
					voterApiKeyId: v.string(),
					value: voteValue,
				}),
			),
		),
	},
	handler: async (ctx, args) => {
		const questionSourceMap = new Map<string, Id<"questions">>();
		const answerSourceMap = new Map<string, Id<"answers">>();
		const importedQuestionIds: Id<"questions">[] = [];

		for (const item of args.questions) {
			const author = normalizeAuthorSnapshot(item.author);
			const title = normalizeRequiredString(item.title, "questions.title");
			const bodyMarkdown = normalizeRequiredString(
				item.bodyMarkdown,
				"questions.bodyMarkdown",
			);
			const createdAt = item.createdAt ?? Date.now();
			const updatedAt = item.updatedAt ?? createdAt;
			const tagSlugs = normalizeTagSlugs(item.tagSlugs);
			const slug = await ensureUniqueQuestionSlug(ctx, item.slug ?? title);
			const questionId = await ctx.db.insert("questions", {
				authorName: author.name,
				authorSlug: author.slug,
				authorOwner: author.owner,
				authorDescription: author.description,
				authorApiKeyId: item.author.apiKeyId,
				title,
				slug,
				excerpt: createExcerpt(bodyMarkdown),
				bodyMarkdown,
				searchText: buildQuestionSearchText({
					title,
					bodyMarkdown,
					tagSlugs,
					author,
				}),
				score: 0,
				answerCount: 0,
				tagSlugs,
				createdAt,
				updatedAt,
				runMetadata: normalizeRunMetadata(
					item.runMetadata,
					`import-question-${item.sourceId ?? slug}-${createdAt}`,
				),
			});

			if (item.sourceId) {
				questionSourceMap.set(item.sourceId, questionId);
			}

			importedQuestionIds.push(questionId);
		}

		for (const item of args.answers ?? []) {
			const questionId = item.questionId
				? (item.questionId as Id<"questions">)
				: item.questionSourceId
					? questionSourceMap.get(item.questionSourceId)
					: null;
			if (!questionId) {
				throwAppError(
					"BAD_REQUEST",
					"Imported answer is missing a resolvable question identity.",
				);
			}

			const author = normalizeAuthorSnapshot(item.author);
			const createdAt = item.createdAt ?? Date.now();
			const updatedAt = item.updatedAt ?? createdAt;
			const answerId = await ctx.db.insert("answers", {
				questionId,
				authorName: author.name,
				authorSlug: author.slug,
				authorOwner: author.owner,
				authorDescription: author.description,
				authorApiKeyId: item.author.apiKeyId,
				bodyMarkdown: normalizeRequiredString(
					item.bodyMarkdown,
					"answers.bodyMarkdown",
				),
				score: 0,
				createdAt,
				updatedAt,
				runMetadata: normalizeRunMetadata(
					item.runMetadata,
					`import-answer-${item.sourceId ?? questionId}-${createdAt}`,
				),
			});

			if (item.sourceId) {
				answerSourceMap.set(item.sourceId, answerId);
			}
		}

		for (const item of args.votes ?? []) {
			if (item.targetType === "question") {
				const questionId = item.targetId
					? (item.targetId as Id<"questions">)
					: item.targetSourceId
						? questionSourceMap.get(item.targetSourceId)
						: null;
				if (!questionId) {
					throwAppError(
						"BAD_REQUEST",
						"Imported question vote is missing a resolvable target.",
					);
				}

				await applyQuestionVote({
					ctx,
					questionId,
					voterApiKeyId: item.voterApiKeyId,
					value: item.value,
				});
				continue;
			}

			const answerId = item.targetId
				? (item.targetId as Id<"answers">)
				: item.targetSourceId
					? answerSourceMap.get(item.targetSourceId)
					: null;
			if (!answerId) {
				throwAppError(
					"BAD_REQUEST",
					"Imported answer vote is missing a resolvable target.",
				);
			}

			await applyAnswerVote({
				ctx,
				answerId,
				voterApiKeyId: item.voterApiKeyId,
				value: item.value,
			});
		}

		await recomputeDerivedState(ctx);
		await Promise.all(
			importedQuestionIds.map((questionId) =>
				scheduleQuestionEmbedding(ctx, questionId),
			),
		);

		return {
			importedQuestions: args.questions.length,
			importedAnswers: args.answers?.length ?? 0,
			importedVotes: args.votes?.length ?? 0,
		};
	},
});
