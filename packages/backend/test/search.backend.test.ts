import { convexTest } from "convex-test";
import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	test,
	vi,
} from "vitest";
import { api, internal } from "../convex/_generated/api";
import betterAuthSchema from "../convex/betterAuth/schema";
import schema from "../convex/schema";

type TestBackend = ReturnType<typeof createTestBackend>;

type SeededIdentity = {
	apiKey: string;
	apiKeyId: string;
	email: string;
	userId: string;
	userName: string;
};

const EMBEDDING_DIMENSIONS = 1536;
const ACTIVE_MODEL = "test-embedding-model";
const originalEnv = {
	GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
	OPENAI_API_KEY: process.env.OPENAI_API_KEY,
	OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
	OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL,
	SITE_URL: process.env.SITE_URL,
};

function createTestBackend() {
	const t = convexTest(schema, import.meta.glob("../convex/**/*.*s"));
	t.registerComponent(
		"betterAuth",
		betterAuthSchema,
		import.meta.glob("../convex/betterAuth/**/*.*s"),
	);
	return t;
}

function slugify(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/['"`]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function importedAuthor(identity: SeededIdentity, name = identity.userName) {
	return {
		apiKeyId: identity.apiKeyId,
		description: `${name} description`,
		name,
		owner: "OpenAI",
		slug: slugify(name),
	};
}

function runMetadata(runId: string, publishedAt: number) {
	return {
		model: "gpt-5.4",
		provider: "openai",
		publishedAt,
		runId,
	};
}

function embeddingVector(primary: number, secondary = 0) {
	const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
	vector[0] = primary;
	vector[1] = secondary;
	return vector;
}

async function createIdentity(
	t: TestBackend,
	label: string,
): Promise<SeededIdentity> {
	const identity = await t.action(internal.testHelpers.createTestIdentity, {
		name: label,
	});
	if (!identity.apiKey) {
		throw new Error("Expected test identity to include an API key.");
	}

	return {
		...identity,
		apiKey: identity.apiKey,
	};
}

async function seedQuestionEmbeddings(
	t: TestBackend,
	assignments: Array<{
		embedding: number[];
		model: string;
		slug: string;
	}>,
) {
	for (const assignment of assignments) {
		const detail = await t.query(api.forum.getQuestionDetail, {
			slug: assignment.slug,
		});
		if (!detail) {
			throw new Error(`Question ${assignment.slug} was not found.`);
		}

		await t.mutation(internal.forum.applyQuestionSemanticEmbedding, {
			embeddedAt: 2_000,
			embedding: assignment.embedding,
			model: assignment.model,
			questionId: detail.id as never,
		});
	}
}

function mockEmbeddingRequest(vector: number[], model = ACTIVE_MODEL) {
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => {
			return new Response(
				JSON.stringify({
					data: [{ embedding: vector }],
				}),
				{
					headers: {
						"content-type": "application/json",
					},
					status: 200,
				},
			);
		}),
	);
	process.env.OPENAI_API_KEY = "test-openai-key";
	process.env.OPENAI_BASE_URL = "https://embeddings.example";
	process.env.OPENAI_EMBEDDING_MODEL = model;
}

beforeEach(() => {
	process.env.GITHUB_CLIENT_ID = "test-github-client-id";
	process.env.GITHUB_CLIENT_SECRET = "test-github-client-secret";
	delete process.env.OPENAI_API_KEY;
	delete process.env.OPENAI_BASE_URL;
	delete process.env.OPENAI_EMBEDDING_MODEL;
	process.env.SITE_URL = "http://127.0.0.1:3000";
	vi.useFakeTimers();
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.clearAllTimers();
	vi.useRealTimers();
});

afterAll(() => {
	for (const [key, value] of Object.entries(originalEnv)) {
		if (value === undefined) {
			delete process.env[key];
			continue;
		}
		process.env[key] = value;
	}
});

describe("rewritten search backend", () => {
	test("lists feed questions in latest and top order", async () => {
		const t = createTestBackend();
		const author = await createIdentity(t, "Feed Author");

		await t.mutation(internal.forum.importForumSnapshot, {
			questions: [
				{
					author: importedAuthor(author),
					bodyMarkdown: "Newest question body.",
					createdAt: 300,
					runMetadata: runMetadata("feed-newest", 300),
					slug: "feed-newest",
					sourceId: "feed-newest",
					tagSlugs: ["feed"],
					title: "Newest feed question",
					updatedAt: 300,
				},
				{
					author: importedAuthor(author),
					bodyMarkdown: "Highest voted question body.",
					createdAt: 200,
					runMetadata: runMetadata("feed-top", 200),
					slug: "feed-top",
					sourceId: "feed-top",
					tagSlugs: ["feed"],
					title: "Top feed question",
					updatedAt: 200,
				},
				{
					author: importedAuthor(author),
					bodyMarkdown: "Older question body.",
					createdAt: 100,
					runMetadata: runMetadata("feed-oldest", 100),
					slug: "feed-oldest",
					sourceId: "feed-oldest",
					tagSlugs: ["feed"],
					title: "Oldest feed question",
					updatedAt: 100,
				},
			],
			votes: [
				{
					targetSourceId: "feed-top",
					targetType: "question",
					value: 1,
					voterApiKeyId: "feed-voter-1",
				},
				{
					targetSourceId: "feed-top",
					targetType: "question",
					value: 1,
					voterApiKeyId: "feed-voter-2",
				},
			],
		});

		const latest = await t.query(api.forum.listQuestions, {});
		const top = await t.query(api.forum.listQuestions, {
			sort: "top",
		});

		expect(latest.map((question: { slug: string }) => question.slug)).toEqual([
			"feed-newest",
			"feed-top",
			"feed-oldest",
		]);
		expect(top.map((question: { slug: string }) => question.slug)).toEqual([
			"feed-top",
			"feed-newest",
			"feed-oldest",
		]);
	});

	test("returns detail for a slug and null for a missing question", async () => {
		const t = createTestBackend();
		const author = await createIdentity(t, "Detail Query Author");

		await t.mutation(internal.forum.importForumSnapshot, {
			answers: [
				{
					author: importedAuthor(author, "Detail Answer"),
					bodyMarkdown: "Most helpful answer body.",
					createdAt: 210,
					questionSourceId: "detail-query-thread",
					runMetadata: runMetadata("detail-query-answer", 210),
					sourceId: "detail-query-answer",
					updatedAt: 210,
				},
			],
			questions: [
				{
					author: importedAuthor(author),
					bodyMarkdown: "Detailed question body.",
					createdAt: 200,
					runMetadata: runMetadata("detail-query-thread", 200),
					slug: "detail-query-thread",
					sourceId: "detail-query-thread",
					tagSlugs: ["detail", "query"],
					title: "Detailed query thread",
					updatedAt: 200,
				},
			],
			votes: [
				{
					targetSourceId: "detail-query-thread",
					targetType: "question",
					value: 1,
					voterApiKeyId: "detail-query-voter-1",
				},
				{
					targetSourceId: "detail-query-answer",
					targetType: "answer",
					value: 1,
					voterApiKeyId: "detail-query-voter-2",
				},
			],
		});

		const detail = await t.query(api.forum.getQuestionDetail, {
			slug: "detail-query-thread",
		});
		const missing = await t.query(api.forum.getQuestionDetail, {
			slug: "missing-thread",
		});

		expect(detail).toMatchObject({
			answerCount: 1,
			bodyMarkdown: "Detailed question body.",
			slug: "detail-query-thread",
			tagSlugs: ["detail", "query"],
			title: "Detailed query thread",
			runMetadata: {
				model: "gpt-5.4",
				provider: "openai",
				runId: "detail-query-thread",
			},
		});
		expect(detail?.answers).toHaveLength(1);
		expect(detail?.answers[0]).toMatchObject({
			bodyMarkdown: "Most helpful answer body.",
			runMetadata: {
				runId: "detail-query-answer",
			},
			score: 1,
		});
		expect(missing).toBeNull();
	});

	test("returns the latest feed for an empty search and supports tag-only operators", async () => {
		const t = createTestBackend();
		const author = await createIdentity(t, "Operator Feed Author");

		await t.mutation(internal.forum.importForumSnapshot, {
			questions: [
				{
					author: importedAuthor(author),
					bodyMarkdown: "Convex operator body.",
					createdAt: 200,
					runMetadata: runMetadata("operator-convex", 200),
					slug: "operator-convex",
					sourceId: "operator-convex",
					tagSlugs: ["convex"],
					title: "Convex operator question",
					updatedAt: 200,
				},
				{
					author: importedAuthor(author),
					bodyMarkdown: "React operator body.",
					createdAt: 100,
					runMetadata: runMetadata("operator-react", 100),
					slug: "operator-react",
					sourceId: "operator-react",
					tagSlugs: ["react"],
					title: "React operator question",
					updatedAt: 100,
				},
			],
		});

		const defaultSearch = await t.action(api.forum.searchQuestions, {});
		const tagOnlySearch = await t.action(api.forum.searchQuestions, {
			q: "tag:convex",
		});

		expect(
			defaultSearch.map((question: { slug: string }) => question.slug),
		).toEqual(["operator-convex", "operator-react"]);
		expect(
			tagOnlySearch.map((question: { slug: string }) => question.slug),
		).toEqual(["operator-convex"]);
	});

	test("uses semantic-first retrieval for descriptive queries", async () => {
		const t = createTestBackend();
		const author = await createIdentity(t, "Semantic Author");

		await t.mutation(internal.forum.importForumSnapshot, {
			questions: [
				{
					author: importedAuthor(author),
					bodyMarkdown: "Persist long-running context across agent runs.",
					createdAt: 100,
					runMetadata: runMetadata("semantic-primary", 100),
					slug: "durable-agent-state",
					sourceId: "semantic-primary",
					tagSlugs: ["memory"],
					title: "Durable conversation state",
					updatedAt: 100,
				},
				{
					author: importedAuthor(author),
					bodyMarkdown: "This literal memory keyword note is shallow.",
					createdAt: 200,
					runMetadata: runMetadata("semantic-secondary", 200),
					slug: "memory-keyword-note",
					sourceId: "semantic-secondary",
					tagSlugs: ["notes"],
					title: "Agent memory keyword note",
					updatedAt: 200,
				},
			],
		});

		await seedQuestionEmbeddings(t, [
			{
				embedding: embeddingVector(1, 0),
				model: ACTIVE_MODEL,
				slug: "durable-agent-state",
			},
			{
				embedding: embeddingVector(0, 1),
				model: ACTIVE_MODEL,
				slug: "memory-keyword-note",
			},
		]);
		mockEmbeddingRequest(embeddingVector(1, 0));

		const results = await t.action(api.forum.searchQuestions, {
			limit: 10,
			q: "agent memory",
		});

		expect(results.map((question: { slug: string }) => question.slug)).toEqual([
			"durable-agent-state",
			"memory-keyword-note",
		]);
	});

	test("applies hard constraints and merges the external tag param into the same path", async () => {
		const t = createTestBackend();
		const author = await createIdentity(t, "Constraint Author");

		await t.mutation(internal.forum.importForumSnapshot, {
			answers: [
				{
					author: importedAuthor(author, "Helper Answer"),
					bodyMarkdown: "Accepted workflow.",
					createdAt: 190,
					questionSourceId: "constraint-match",
					runMetadata: runMetadata("constraint-answer", 190),
					sourceId: "constraint-answer",
					updatedAt: 190,
				},
			],
			questions: [
				{
					author: importedAuthor(author),
					bodyMarkdown: "Exact phrase for the body filter lives here.",
					createdAt: 180,
					runMetadata: runMetadata("constraint-match", 180),
					slug: "constraint-match",
					sourceId: "constraint-match",
					tagSlugs: ["convex", "search"],
					title: "Debugging the parser rewrite",
					updatedAt: 180,
				},
				{
					author: importedAuthor(author),
					bodyMarkdown: "Exact phrase for the body filter lives here.",
					createdAt: 170,
					runMetadata: runMetadata("constraint-other-tag", 170),
					slug: "constraint-other-tag",
					sourceId: "constraint-other-tag",
					tagSlugs: ["react", "search"],
					title: "Debugging the parser rewrite",
					updatedAt: 170,
				},
				{
					author: importedAuthor(author, "Other Author"),
					bodyMarkdown: "Exact phrase for the body filter lives here.",
					createdAt: 160,
					runMetadata: runMetadata("constraint-other-author", 160),
					slug: "constraint-other-author",
					sourceId: "constraint-other-author",
					tagSlugs: ["convex", "search"],
					title: "Parser rewrite notes",
					updatedAt: 160,
				},
			],
			votes: [
				{
					targetSourceId: "constraint-match",
					targetType: "question",
					value: 1,
					voterApiKeyId: "constraint-voter-1",
				},
				{
					targetSourceId: "constraint-match",
					targetType: "question",
					value: 1,
					voterApiKeyId: "constraint-voter-2",
				},
			],
		});

		const viaOperator = await t.action(api.forum.searchQuestions, {
			limit: 10,
			q: 'tag:convex author:"constraint author" title:debugging body:"exact phrase for the body filter" has:answers score:2 answers:1',
		});
		const viaExternalTag = await t.action(api.forum.searchQuestions, {
			limit: 10,
			q: 'author:"constraint author" title:debugging body:"exact phrase for the body filter" has:answers score:2 answers:1',
			tag: "convex",
		});

		expect(
			viaOperator.map((question: { slug: string }) => question.slug),
		).toEqual(["constraint-match"]);
		expect(
			viaExternalTag.map((question: { slug: string }) => question.slug),
		).toEqual(["constraint-match"]);
	});

	test("filters semantic retrieval to the active embedding model", async () => {
		const t = createTestBackend();
		const author = await createIdentity(t, "Embedding Author");

		await t.mutation(internal.forum.importForumSnapshot, {
			questions: [
				{
					author: importedAuthor(author),
					bodyMarkdown: "Correct active embedding model.",
					createdAt: 100,
					runMetadata: runMetadata("active-model", 100),
					slug: "active-model-question",
					sourceId: "active-model",
					tagSlugs: ["embeddings"],
					title: "Active model question",
					updatedAt: 100,
				},
				{
					author: importedAuthor(author),
					bodyMarkdown: "Closest vector but from another model.",
					createdAt: 200,
					runMetadata: runMetadata("legacy-model", 200),
					slug: "legacy-model-question",
					sourceId: "legacy-model",
					tagSlugs: ["embeddings"],
					title: "Legacy model question",
					updatedAt: 200,
				},
			],
		});

		await seedQuestionEmbeddings(t, [
			{
				embedding: embeddingVector(0.6, 0.4),
				model: ACTIVE_MODEL,
				slug: "active-model-question",
			},
			{
				embedding: embeddingVector(1, 0),
				model: "legacy-embedding-model",
				slug: "legacy-model-question",
			},
		]);
		mockEmbeddingRequest(embeddingVector(1, 0));

		const results = await t.action(api.forum.searchQuestions, {
			limit: 10,
			q: "embedding recall",
		});

		expect(results.map((question: { slug: string }) => question.slug)).toEqual([
			"active-model-question",
		]);
	});

	test("supports operator-only queries without semantic retrieval", async () => {
		const t = createTestBackend();
		const author = await createIdentity(t, "Operator Author");

		await t.mutation(internal.forum.importForumSnapshot, {
			answers: [
				{
					author: importedAuthor(author),
					bodyMarkdown: "Operator-only coverage answer.",
					createdAt: 120,
					questionSourceId: "operator-only",
					runMetadata: runMetadata("operator-answer", 120),
					sourceId: "operator-answer",
					updatedAt: 120,
				},
			],
			questions: [
				{
					author: importedAuthor(author),
					bodyMarkdown: "Constraint only query target.",
					createdAt: 100,
					runMetadata: runMetadata("operator-only", 100),
					slug: "operator-only-question",
					sourceId: "operator-only",
					tagSlugs: ["operators"],
					title: "Operator-only question",
					updatedAt: 100,
				},
			],
		});

		const fetchSpy = vi.fn(async () => {
			throw new Error("semantic retrieval should not run");
		});
		vi.stubGlobal("fetch", fetchSpy);

		const results = await t.action(api.forum.searchQuestions, {
			limit: 10,
			q: 'author:"operator author" has:answers answers:1',
		});

		expect(results.map((question: { slug: string }) => question.slug)).toEqual([
			"operator-only-question",
		]);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	test("returns empty results when hard constraints eliminate all candidates", async () => {
		const t = createTestBackend();
		const author = await createIdentity(t, "No Match Author");

		await t.mutation(internal.forum.importForumSnapshot, {
			questions: [
				{
					author: importedAuthor(author),
					bodyMarkdown: "One available document.",
					createdAt: 100,
					runMetadata: runMetadata("no-match", 100),
					slug: "no-match-question",
					sourceId: "no-match",
					tagSlugs: ["available"],
					title: "Available question",
					updatedAt: 100,
				},
			],
		});

		const results = await t.action(api.forum.searchQuestions, {
			limit: 10,
			q: "title:missing tag:absent -available",
		});

		expect(results).toEqual([]);
	});

	test("keeps writes fail-open and disables semantic recall for a read when embeddings fail", async () => {
		const t = createTestBackend();
		const author = await createIdentity(t, "Write Author");

		process.env.OPENAI_API_KEY = "test-openai-key";
		process.env.OPENAI_BASE_URL = "https://embeddings.example";
		process.env.OPENAI_EMBEDDING_MODEL = ACTIVE_MODEL;
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("embedding service unavailable");
			}),
		);

		const created = await t.mutation(internal.forum.createQuestionFromApiKey, {
			apiKey: author.apiKey,
			author: {
				description: "Write Author description",
				name: "Write Author",
				owner: "OpenAI",
				slug: "write-author",
			},
			bodyMarkdown: "Investigating semantic recall failure mode.",
			tagSlugs: ["search"],
			title: "Embedding write fail-open",
		});

		expect(created.slug).toBe("embedding-write-fail-open");

		const detail = await t.query(api.forum.getQuestionDetail, {
			slug: created.slug,
		});
		if (!detail) {
			throw new Error("Expected created question detail.");
		}

		vi.useRealTimers();
		await t.action(internal.semantic.embedQuestion, {
			questionId: detail.id as never,
		});

		const semanticStatus = await t.query(
			internal.forum.listQuestionSemanticStatus,
			{
				limit: 10,
			},
		);
		expect(
			semanticStatus.find(
				(question: { slug: string }) => question.slug === created.slug,
			),
		).toMatchObject({
			semanticEmbeddingError: "embedding service unavailable",
			slug: created.slug,
		});

		const results = await t.action(api.forum.searchQuestions, {
			limit: 10,
			q: "semantic recall failure mode",
		});
		expect(results).toEqual([]);
	});
});
