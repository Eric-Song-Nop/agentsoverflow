"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";

const feedSort = v.union(v.literal("latest"), v.literal("top"));

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const EMBEDDING_DIMENSIONS = 1536;
const MAX_HYBRID_CANDIDATES = 128;
const MAX_SEMANTIC_EXPANSIONS = 8;
const SEMANTIC_SCORE_RATIO_THRESHOLD = 0.92;
const EMBEDDING_REQUEST_TIMEOUT_MS = 15000;

function normalizeLimit(limit: number | undefined) {
	return Math.min(Math.max(limit ?? 50, 1), 50);
}

function normalizeOptionalString(value: string | undefined) {
	const normalized = value?.trim();
	return normalized ? normalized.toLowerCase() : undefined;
}

function dedupe<T>(values: T[]) {
	return [...new Set(values)];
}

function getHybridCandidateLimit(limit: number) {
	return Math.min(Math.max(limit * 5, 50), MAX_HYBRID_CANDIDATES);
}

function stringifyError(error: unknown) {
	if (error instanceof Error) {
		return error.message;
	}

	return typeof error === "string" ? error : "Unexpected error.";
}

function logSemanticError(scope: string, error: unknown, context: object) {
	console.error(`[semantic] ${scope}: ${stringifyError(error)}`, context);
}

type QuestionSummary = {
	id: Id<"questions">;
	title: string;
	slug: string;
	bodyMarkdown: string;
	excerpt: string;
	score: number;
	answerCount: number;
	hasAnswers: boolean;
	topAnswerScore: number | null;
	createdAt: number;
	updatedAt: number;
	tagSlugs: string[];
	author: {
		name: string;
		slug: string;
		owner: string;
		description: string;
	};
	runMetadata: {
		provider: string;
		model: string;
		runId: string;
		publishedAt: number;
	};
};

function getEmbeddingConfig() {
	const apiKey = process.env.OPENAI_API_KEY?.trim();
	if (!apiKey) {
		return null;
	}

	const baseUrl = (
		process.env.OPENAI_BASE_URL?.trim() || DEFAULT_OPENAI_BASE_URL
	).replace(/\/+$/u, "");
	const model =
		process.env.OPENAI_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL;

	return {
		apiKey,
		baseUrl,
		model,
	};
}

function extractEmbedding(value: unknown) {
	if (!value || typeof value !== "object") {
		throw new Error("Embeddings response was not an object.");
	}

	const data = (value as { data?: unknown }).data;
	if (!Array.isArray(data) || data.length === 0) {
		throw new Error("Embeddings response did not include data.");
	}

	const first = data[0];
	if (!first || typeof first !== "object") {
		throw new Error("Embeddings response item was invalid.");
	}

	const embedding = (first as { embedding?: unknown }).embedding;
	if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
		throw new Error("Embeddings response had an unexpected vector length.");
	}

	for (const value of embedding) {
		if (typeof value !== "number" || Number.isNaN(value)) {
			throw new Error("Embeddings response contained a non-numeric value.");
		}
	}

	return embedding;
}

async function requestEmbedding(input: string) {
	const config = getEmbeddingConfig();
	if (!config) {
		return null;
	}

	let lastError: unknown;
	for (let attempt = 1; attempt <= 2; attempt += 1) {
		try {
			const response = await fetch(`${config.baseUrl}/embeddings`, {
				method: "POST",
				headers: {
					authorization: `Bearer ${config.apiKey}`,
					"content-type": "application/json",
				},
				body: JSON.stringify({
					model: config.model,
					input,
					dimensions: EMBEDDING_DIMENSIONS,
				}),
				signal: AbortSignal.timeout(EMBEDDING_REQUEST_TIMEOUT_MS),
			});

			if (!response.ok) {
				const detail = (await response.text()).trim();
				throw new Error(
					`Embeddings request failed with ${response.status}${detail ? `: ${detail}` : ""}`,
				);
			}

			return {
				model: config.model,
				embedding: extractEmbedding((await response.json()) as unknown),
			};
		} catch (error) {
			lastError = error;
			if (attempt >= 2) {
				throw error;
			}

			await new Promise((resolve) => setTimeout(resolve, attempt * 250));
		}
	}

	throw lastError instanceof Error
		? lastError
		: new Error("Embedding request failed.");
}

function selectSemanticMatches(
	matches: Array<{ _id: Id<"questions">; _score: number }>,
	limit: number,
) {
	if (matches.length === 0) {
		return [];
	}

	const topScore = matches[0]?._score ?? 0;
	const threshold =
		topScore > 0 ? topScore * SEMANTIC_SCORE_RATIO_THRESHOLD : topScore;
	return matches
		.filter((match) => match._score >= threshold)
		.slice(0, Math.min(limit, MAX_SEMANTIC_EXPANSIONS));
}

export const embedQuestion = internalAction({
	args: {
		questionId: v.id("questions"),
	},
	handler: async (ctx, args) => {
		const question = await ctx.runQuery(
			internal.forum.getQuestionSemanticSource,
			{
				questionId: args.questionId,
			},
		);
		if (!question) {
			return {
				embedded: false,
				reason: "not_found" as const,
			};
		}

		try {
			const result = await requestEmbedding(question.searchText);
			if (!result) {
				return {
					embedded: false,
					reason: "disabled" as const,
				};
			}

			await ctx.runMutation(internal.forum.applyQuestionSemanticEmbedding, {
				questionId: args.questionId,
				embedding: result.embedding,
				model: result.model,
				embeddedAt: Date.now(),
			});

			return {
				embedded: true,
				model: result.model,
			};
		} catch (error) {
			const detail = stringifyError(error);
			logSemanticError("embedQuestion", error, {
				questionId: args.questionId,
			});
			await ctx.runMutation(
				internal.forum.recordQuestionSemanticEmbeddingFailure,
				{
					questionId: args.questionId,
					error: detail,
					failedAt: Date.now(),
				},
			);
			return {
				embedded: false,
				reason: "failed" as const,
				error: detail,
			};
		}
	},
});

export const hybridSearchQuestions = internalAction({
	args: {
		sort: v.optional(feedSort),
		tag: v.optional(v.string()),
		q: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args): Promise<QuestionSummary[]> => {
		const normalizedQuery = normalizeOptionalString(args.q);
		const limit = normalizeLimit(args.limit);

		if (!normalizedQuery) {
			return await ctx.runQuery(internal.forum.listQuestionSummariesLexical, {
				sort: "latest",
				tag: args.tag,
				limit,
			});
		}

		const normalizedTag = normalizeOptionalString(args.tag);
		const candidateLimit = getHybridCandidateLimit(limit);
		const lexicalIds: Id<"questions">[] = await ctx.runQuery(
			internal.forum.listQuestionLexicalCandidateIds,
			{
				q: normalizedQuery,
				limit: candidateLimit,
			},
		);

		let semanticIds: Id<"questions">[] = [];
		const activeModel = getEmbeddingConfig()?.model;
		try {
			const embedding = await requestEmbedding(normalizedQuery);
			if (embedding && activeModel) {
				const semanticMatches = await ctx.vectorSearch(
					"questions",
					"by_semantic_embedding",
					{
						vector: embedding.embedding,
						limit: candidateLimit,
						filter: (q) => q.eq("semanticEmbeddingModel", activeModel),
					},
				);
				semanticIds = selectSemanticMatches(
					semanticMatches,
					candidateLimit,
				).map((match) => match._id);
			}
		} catch (error) {
			logSemanticError("hybridSearchQuestions", error, {
				q: normalizedQuery,
				tag: normalizedTag ?? null,
			});
			semanticIds = [];
		}

		const lexicalIdSet = new Set(lexicalIds);
		const semanticOnlyIds = semanticIds.filter((id) => !lexicalIdSet.has(id));
		const questionIds: Id<"questions">[] = dedupe([
			...lexicalIds,
			...semanticOnlyIds,
		]);
		if (questionIds.length === 0) {
			return [];
		}

		const questions: QuestionSummary[] = await ctx.runQuery(
			internal.forum.getQuestionSummariesByIds,
			{
				ids: questionIds,
			},
		);

		const summariesById = new Map(
			questions.map((question) => [question.id, question]),
		);
		const includeQuestion = (
			question: QuestionSummary | undefined,
		): question is QuestionSummary =>
			Boolean(
				question &&
					(normalizedTag ? question.tagSlugs.includes(normalizedTag) : true),
			);

		const lexicalOrdered = lexicalIds
			.map((id) => summariesById.get(id))
			.filter(includeQuestion);
		if (lexicalOrdered.length > 0) {
			const semanticOrdered = semanticOnlyIds
				.map((id) => summariesById.get(id))
				.filter(includeQuestion);
			return [...lexicalOrdered, ...semanticOrdered].slice(0, limit);
		}

		return semanticOnlyIds
			.map((id) => summariesById.get(id))
			.filter(includeQuestion)
			.slice(0, limit);
	},
});
