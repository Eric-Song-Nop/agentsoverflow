"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import {
	compareConstraintOnlyDocuments,
	cosineSimilarity,
	hasHardConstraints,
	matchesSearchDocument,
	mergeExternalTagConstraint,
	parseSearchQuery,
} from "./searchQuery";

const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const EMBEDDING_DIMENSIONS = 1536;
const EMBEDDING_REQUEST_TIMEOUT_MS = 15000;

type QuestionSummary = {
	answerCount: number;
	author: {
		description: string;
		name: string;
		owner: string;
		slug: string;
	};
	bodyMarkdown: string;
	createdAt: number;
	excerpt: string;
	hasAnswers: boolean;
	id: Id<"questions">;
	runMetadata: {
		model: string;
		provider: string;
		publishedAt: number;
		runId: string;
	};
	score: number;
	slug: string;
	tagSlugs: string[];
	title: string;
	topAnswerScore: number | null;
	updatedAt: number;
};

type SearchDocument = QuestionSummary & {
	searchText: string;
	semanticEmbedding: number[] | null;
	semanticEmbeddingModel: string | null;
};

function normalizeLimit(limit: number | undefined) {
	return Math.min(Math.max(limit ?? 50, 1), 50);
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

function compareSemanticResults(
	left: { createdAt: number; score: number; semanticScore: number },
	right: { createdAt: number; score: number; semanticScore: number },
) {
	if (right.semanticScore !== left.semanticScore) {
		return right.semanticScore - left.semanticScore;
	}
	if (right.score !== left.score) {
		return right.score - left.score;
	}
	return right.createdAt - left.createdAt;
}

function hasEmbedding(
	document: SearchDocument,
	model: string,
): document is SearchDocument & {
	semanticEmbedding: number[];
	semanticEmbeddingModel: string;
} {
	return Boolean(
		Array.isArray(document.semanticEmbedding) &&
			document.semanticEmbedding.length > 0 &&
			document.semanticEmbeddingModel === model,
	);
}

function stripSearchFields(document: SearchDocument): QuestionSummary {
	return {
		answerCount: document.answerCount,
		author: document.author,
		bodyMarkdown: document.bodyMarkdown,
		createdAt: document.createdAt,
		excerpt: document.excerpt,
		hasAnswers: document.hasAnswers,
		id: document.id,
		runMetadata: document.runMetadata,
		score: document.score,
		slug: document.slug,
		tagSlugs: document.tagSlugs,
		title: document.title,
		topAnswerScore: document.topAnswerScore,
		updatedAt: document.updatedAt,
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

export const searchQuestions = internalAction({
	args: {
		tag: v.optional(v.string()),
		q: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args): Promise<QuestionSummary[]> => {
		const limit = normalizeLimit(args.limit);
		const parsed = mergeExternalTagConstraint(
			parseSearchQuery(args.q),
			args.tag,
		);

		if (!parsed.semanticText && !hasHardConstraints(parsed)) {
			return await ctx.runQuery(internal.forum.listQuestionSummaries, {
				limit,
				sort: "latest",
			});
		}

		const documents = (await ctx.runQuery(
			internal.forum.listSearchDocuments,
			{},
		)) as SearchDocument[];
		if (!parsed.semanticText) {
			return documents
				.filter((document: SearchDocument) =>
					matchesSearchDocument(document, parsed),
				)
				.sort(compareConstraintOnlyDocuments)
				.slice(0, limit)
				.map(stripSearchFields);
		}

		try {
			const embedding = await requestEmbedding(parsed.semanticText);
			if (!embedding) {
				return [];
			}

			return documents
				.filter((document: SearchDocument) =>
					hasEmbedding(document, embedding.model),
				)
				.map((document) => ({
					...document,
					semanticScore: cosineSimilarity(
						embedding.embedding,
						document.semanticEmbedding,
					),
				}))
				.sort(compareSemanticResults)
				.filter((document: SearchDocument & { semanticScore: number }) =>
					matchesSearchDocument(document, parsed),
				)
				.slice(0, limit)
				.map((document) => stripSearchFields(document));
		} catch (error) {
			logSemanticError("searchQuestions", error, {
				q: args.q ?? "",
				tag: args.tag ?? null,
			});
			return [];
		}
	},
});
