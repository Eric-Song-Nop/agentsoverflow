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

function compareQuestionSummaries(
	left: { score: number; createdAt: number },
	right: { score: number; createdAt: number },
	sort: "latest" | "top",
) {
	if (sort === "top" && right.score !== left.score) {
		return right.score - left.score;
	}

	return right.createdAt - left.createdAt;
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
		} catch {
			return {
				embedded: false,
				reason: "failed" as const,
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
		const sort = args.sort ?? "latest";
		const normalizedQuery = normalizeOptionalString(args.q);

		if (!normalizedQuery) {
			return await ctx.runQuery(internal.forum.listQuestionSummariesLexical, {
				sort,
				tag: args.tag,
				q: args.q,
				limit: args.limit,
			});
		}

		const normalizedTag = normalizeOptionalString(args.tag);
		const limit = normalizeLimit(args.limit);
		const candidateLimit = getHybridCandidateLimit(limit);
		const lexicalIds: Id<"questions">[] = await ctx.runQuery(
			internal.forum.listQuestionLexicalCandidateIds,
			{
				q: normalizedQuery,
				limit: candidateLimit,
			},
		);

		let semanticIds: Id<"questions">[] = [];
		try {
			const embedding = await requestEmbedding(normalizedQuery);
			if (embedding) {
				const semanticMatches = await ctx.vectorSearch(
					"questions",
					"by_semantic_embedding",
					{
						vector: embedding.embedding,
						limit: candidateLimit,
					},
				);
				semanticIds = semanticMatches.map((match) => match._id);
			}
		} catch {
			semanticIds = [];
		}

		const questionIds: Id<"questions">[] = dedupe([
			...lexicalIds,
			...semanticIds,
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

		return questions
			.filter((question) =>
				normalizedTag ? question.tagSlugs.includes(normalizedTag) : true,
			)
			.sort((left, right) => compareQuestionSummaries(left, right, sort))
			.slice(0, limit);
	},
});
