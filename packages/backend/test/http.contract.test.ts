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

type ApiResponse<T> = {
	payload: T;
	response: Response;
};

const originalEnv = {
	GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
	OPENAI_API_KEY: process.env.OPENAI_API_KEY,
	OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
	OPENAI_EMBEDDING_MODEL: process.env.OPENAI_EMBEDDING_MODEL,
	SITE_URL: process.env.SITE_URL,
};

let uniqueCounter = 0;
const EMBEDDING_DIMENSIONS = 1536;
const ACTIVE_EMBEDDING_MODEL = "test-embedding-model";

function createTestBackend() {
	const t = convexTest(schema, import.meta.glob("../convex/**/*.*s"));
	t.registerComponent(
		"betterAuth",
		betterAuthSchema,
		import.meta.glob("../convex/betterAuth/**/*.*s"),
	);
	return t;
}

function nextTimestamp() {
	uniqueCounter += 1;
	return 1_750_000_000_000 + uniqueCounter;
}

function slugify(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/['"`]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function authorSnapshot(identity: SeededIdentity, name = identity.userName) {
	return {
		description: `${name} description`,
		name,
		owner: "OpenAI",
		slug: slugify(name),
	};
}

function importedAuthor(identity: SeededIdentity, name = identity.userName) {
	return {
		...authorSnapshot(identity, name),
		apiKeyId: identity.apiKeyId,
	};
}

function runMetadata(runId: string, publishedAt = nextTimestamp()) {
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

async function requestJson<T>(
	t: TestBackend,
	path: string,
	init: {
		apiKey?: string;
		body?: unknown;
		method?: string;
	} = {},
): Promise<ApiResponse<T>> {
	const headers = new Headers();
	if (init.apiKey) {
		headers.set("authorization", `Bearer ${init.apiKey}`);
	}
	if (init.body !== undefined) {
		headers.set("content-type", "application/json");
	}

	const response = await t.fetch(path, {
		body: init.body === undefined ? undefined : JSON.stringify(init.body),
		headers,
		method: init.method ?? "GET",
	});
	const payload = (await response.json()) as T;
	return {
		payload,
		response,
	};
}

function expectStructuredError(
	payload: unknown,
	status: number,
	response: Response,
	code: string,
	messageFragment?: string,
) {
	expect(response.status).toBe(status);
	expect(payload).toMatchObject({
		code,
		error: expect.any(String),
	});
	if (messageFragment) {
		expect((payload as { error: string }).error.toLowerCase()).toContain(
			messageFragment.toLowerCase(),
		);
	}
}

async function createQuestion(
	t: TestBackend,
	apiKey: string,
	body: {
		author?: {
			description: string;
			name: string;
			owner: string;
			slug: string;
		};
		bodyMarkdown: string;
		tagSlugs?: string[];
		title: string;
	},
) {
	return await requestJson<{
		author: {
			description: string;
			name: string;
			owner: string;
			slug: string;
		};
		createdAt: number;
		id: string;
		slug: string;
	}>(t, "/cli/questions", {
		apiKey,
		body,
		method: "POST",
	});
}

async function seedQuestionEmbedding(
	t: TestBackend,
	assignment: {
		embedding: number[];
		model: string;
		slug: string;
	},
) {
	const detail = await t.query(api.forum.getQuestionDetail, {
		slug: assignment.slug,
	});
	if (!detail) {
		throw new Error(`Question ${assignment.slug} was not found.`);
	}

	await t.mutation(internal.forum.applyQuestionSemanticEmbedding, {
		embeddedAt: nextTimestamp(),
		embedding: assignment.embedding,
		model: assignment.model,
		questionId: detail.id as never,
	});
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

describe("CLI HTTP contract", () => {
	test("POST /cli/auth/whoami returns the API key owner and maps invalid keys to structured 401s", async () => {
		const t = createTestBackend();
		const author = await createIdentity(t, "Auth Owner");

		const success = await requestJson<{
			apiKey: {
				createdAt: string;
				enabled: boolean;
				id: string;
				referenceId: string;
			};
			user: {
				email: string;
				id: string;
				image: string | null;
				name: string;
			};
		}>(t, "/cli/auth/whoami", {
			apiKey: author.apiKey,
			method: "POST",
		});

		expect(success.response.status).toBe(200);
		expect(success.payload).toMatchObject({
			apiKey: {
				enabled: true,
				id: author.apiKeyId,
				referenceId: author.userId,
			},
			user: {
				email: author.email,
				id: author.userId,
				image: null,
				name: author.userName,
			},
		});
		expect(success.payload.apiKey.createdAt).toEqual(expect.any(String));

		const failure = await requestJson<{
			code: string;
			error: string;
		}>(t, "/cli/auth/whoami", {
			apiKey: "aso_invalid_key",
			method: "POST",
		});

		expectStructuredError(
			failure.payload,
			401,
			failure.response,
			"UNAUTHORIZED",
			"api key",
		);
	});

	test("GET /questions/search returns the rewritten summary shape for semantic-first search and remains anonymous-readable", async () => {
		const t = createTestBackend();
		const author = await createIdentity(t, "Search Author");
		const authenticatedReader = await createIdentity(t, "Authenticated Reader");

		await t.mutation(internal.forum.importForumSnapshot, {
			questions: [
				{
					author: importedAuthor(author),
					bodyMarkdown: "Durable context survives long-running agent loops.",
					createdAt: 500,
					runMetadata: runMetadata("semantic-http-primary", 500),
					slug: "semantic-http-primary",
					sourceId: "semantic-http-primary",
					tagSlugs: ["convex", "memory"],
					title: "Durable agent context",
					updatedAt: 500,
				},
				{
					author: importedAuthor(author),
					createdAt: 200,
					bodyMarkdown: "Legacy vector notes with weaker semantic recall.",
					runMetadata: runMetadata("semantic-http-secondary", 200),
					slug: "semantic-http-secondary",
					sourceId: "semantic-http-secondary",
					tagSlugs: ["convex", "notes"],
					title: "Vector notes",
					updatedAt: 200,
				},
			],
		});
		await seedQuestionEmbedding(t, {
			embedding: embeddingVector(1, 0),
			model: ACTIVE_EMBEDDING_MODEL,
			slug: "semantic-http-primary",
		});
		await seedQuestionEmbedding(t, {
			embedding: embeddingVector(0.2, 0.8),
			model: ACTIVE_EMBEDDING_MODEL,
			slug: "semantic-http-secondary",
		});
		process.env.OPENAI_API_KEY = "test-openai-key";
		process.env.OPENAI_BASE_URL = "https://embeddings.example";
		process.env.OPENAI_EMBEDDING_MODEL = ACTIVE_EMBEDDING_MODEL;
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				return new Response(
					JSON.stringify({
						data: [{ embedding: embeddingVector(1, 0) }],
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

		const anonymous = await requestJson<
			Array<{
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
				id: string;
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
			}>
		>(t, "/questions/search?q=agent%20memory&tag=convex&limit=2");
		const authenticated = await requestJson<
			Array<{
				id: string;
				slug: string;
			}>
		>(t, "/questions/search?q=agent%20memory&tag=convex&limit=2", {
			apiKey: authenticatedReader.apiKey,
		});

		expect(anonymous.response.status).toBe(200);
		expect(authenticated.response.status).toBe(200);
		expect(authenticated.payload).toEqual(anonymous.payload);
		expect(anonymous.payload[0]).toMatchObject({
			answerCount: 0,
			author: {
				name: author.userName,
				owner: "OpenAI",
			},
			hasAnswers: false,
			runMetadata: {
				model: "gpt-5.4",
				provider: "openai",
			},
			slug: "semantic-http-primary",
			tagSlugs: ["convex", "memory"],
			title: "Durable agent context",
			topAnswerScore: null,
		});
	});

	test("GET /questions/search rejects the removed legacy sort parameter", async () => {
		const t = createTestBackend();

		const response = await requestJson<{
			code: string;
			error: string;
		}>(t, "/questions/search?sort=top");

		expectStructuredError(
			response.payload,
			400,
			response.response,
			"BAD_REQUEST",
			"sort",
		);
	});

	test("GET /questions/search supports operator-only tag queries", async () => {
		const t = createTestBackend();
		const author = await createIdentity(t, "Operator HTTP Author");

		await t.mutation(internal.forum.importForumSnapshot, {
			questions: [
				{
					author: importedAuthor(author),
					bodyMarkdown: "Convex public search body.",
					createdAt: 200,
					runMetadata: runMetadata("http-operator-convex", 200),
					slug: "http-operator-convex",
					sourceId: "http-operator-convex",
					tagSlugs: ["convex", "search"],
					title: "HTTP operator convex question",
					updatedAt: 200,
				},
				{
					author: importedAuthor(author),
					bodyMarkdown: "React public search body.",
					createdAt: 100,
					runMetadata: runMetadata("http-operator-react", 100),
					slug: "http-operator-react",
					sourceId: "http-operator-react",
					tagSlugs: ["react", "search"],
					title: "HTTP operator react question",
					updatedAt: 100,
				},
			],
		});

		const response = await requestJson<
			Array<{
				slug: string;
				tagSlugs: string[];
				title: string;
			}>
		>(t, "/questions/search?q=tag%3Aconvex");

		expect(response.response.status).toBe(200);
		expect(response.payload).toEqual([
			expect.objectContaining({
				slug: "http-operator-convex",
				tagSlugs: ["convex", "search"],
				title: "HTTP operator convex question",
			}),
		]);
	});

	test("GET /cli/questions/:slug returns detail and maps missing slugs to 404s", async () => {
		const t = createTestBackend();
		const author = await createIdentity(t, "Detail Author");

		await t.mutation(internal.forum.importForumSnapshot, {
			answers: [
				{
					author: importedAuthor(author, "First Answer"),
					bodyMarkdown: "First answer body",
					createdAt: 200,
					questionSourceId: "detail-thread",
					runMetadata: runMetadata("detail-answer-1", 200),
					sourceId: "detail-answer-1",
					updatedAt: 200,
				},
				{
					author: importedAuthor(author, "Second Answer"),
					bodyMarkdown: "Second answer body",
					createdAt: 100,
					questionSourceId: "detail-thread",
					runMetadata: runMetadata("detail-answer-2", 100),
					sourceId: "detail-answer-2",
					updatedAt: 100,
				},
			],
			questions: [
				{
					author: importedAuthor(author),
					bodyMarkdown: "Full question body",
					createdAt: 50,
					runMetadata: runMetadata("detail-thread", 50),
					slug: "detail-thread",
					sourceId: "detail-thread",
					tagSlugs: ["detail"],
					title: "Detail thread",
					updatedAt: 50,
				},
			],
			votes: [
				{
					targetSourceId: "detail-answer-1",
					targetType: "answer",
					value: 1,
					voterApiKeyId: "detail-voter-1",
				},
				{
					targetSourceId: "detail-answer-2",
					targetType: "answer",
					value: 1,
					voterApiKeyId: "detail-voter-2",
				},
				{
					targetSourceId: "detail-answer-2",
					targetType: "answer",
					value: 1,
					voterApiKeyId: "detail-voter-3",
				},
			],
		});

		const success = await requestJson<{
			answers: Array<{
				bodyMarkdown: string;
				score: number;
			}>;
			answerCount: number;
			slug: string;
			topAnswerScore: number | null;
		}>(t, "/cli/questions/detail-thread");

		expect(success.response.status).toBe(200);
		expect(success.payload).toMatchObject({
			answerCount: 2,
			slug: "detail-thread",
			topAnswerScore: 2,
		});
		expect(
			success.payload.answers.map((answer) => answer.bodyMarkdown),
		).toEqual(["Second answer body", "First answer body"]);
		expect(success.payload.answers.map((answer) => answer.score)).toEqual([
			2, 1,
		]);

		const missing = await requestJson<{
			code: string;
			error: string;
		}>(t, "/cli/questions/missing-thread");
		expectStructuredError(
			missing.payload,
			404,
			missing.response,
			"NOT_FOUND",
			"question not found",
		);
	});

	test("POST /cli/questions creates questions and maps missing author fields to structured 400s", async () => {
		const t = createTestBackend();
		const author = await createIdentity(t, "Question Key Owner");

		const success = await createQuestion(t, author.apiKey, {
			author: {
				description: "  Tests backend writes  ",
				name: "  Grace Hopper  ",
				owner: "  OpenAI  ",
				slug: "",
			},
			bodyMarkdown: "  How do I test HTTP contracts safely?  ",
			tagSlugs: ["Tests", "tests", "Backend"],
			title: "  Ship contract tests safely  ",
		});

		expect(success.response.status).toBe(201);
		expect(success.payload).toMatchObject({
			author: {
				description: "Tests backend writes",
				name: "Grace Hopper",
				owner: "OpenAI",
				slug: "grace-hopper",
			},
			createdAt: expect.any(Number),
			id: expect.any(String),
			slug: "ship-contract-tests-safely",
		});

		const detail = await t.query(api.forum.getQuestionDetail, {
			slug: success.payload.slug,
		});
		expect(detail).toMatchObject({
			bodyMarkdown: "How do I test HTTP contracts safely?",
			tagSlugs: ["tests", "backend"],
			title: "Ship contract tests safely",
		});

		const missingAuthor = await requestJson<{
			code: string;
			error: string;
		}>(t, "/cli/questions", {
			apiKey: author.apiKey,
			body: {
				bodyMarkdown: "Question body",
				title: "Missing author",
			},
			method: "POST",
		});

		expectStructuredError(
			missingAuthor.payload,
			400,
			missingAuthor.response,
			"BAD_REQUEST",
			"author",
		);
	});

	test("POST /cli/answers creates answers and maps missing required fields to structured 400s", async () => {
		const t = createTestBackend();
		const questionAuthor = await createIdentity(t, "Question Author");
		const answerAuthor = await createIdentity(t, "Answer Author");
		const question = await createQuestion(t, questionAuthor.apiKey, {
			author: authorSnapshot(questionAuthor),
			bodyMarkdown: "Question body",
			title: "Answer contract target",
		});

		const success = await requestJson<{
			author: {
				name: string;
				owner: string;
				slug: string;
			};
			createdAt: number;
			id: string;
			questionId: string;
		}>(t, "/cli/answers", {
			apiKey: answerAuthor.apiKey,
			body: {
				author: {
					description: "  Answer writer  ",
					name: "  Margaret Hamilton  ",
					owner: "  OpenAI  ",
					slug: "",
				},
				bodyMarkdown: "  Use the HTTP action contract.  ",
				questionId: question.payload.id,
			},
			method: "POST",
		});

		expect(success.response.status).toBe(201);
		expect(success.payload).toMatchObject({
			author: {
				name: "Margaret Hamilton",
				owner: "OpenAI",
				slug: "margaret-hamilton",
			},
			createdAt: expect.any(Number),
			id: expect.any(String),
			questionId: question.payload.id,
		});

		const updatedQuestion = await t.query(api.forum.getQuestionDetail, {
			slug: question.payload.slug,
		});
		expect(updatedQuestion).toMatchObject({
			answerCount: 1,
			topAnswerScore: 0,
		});

		const missingAuthor = await requestJson<{
			code: string;
			error: string;
		}>(t, "/cli/answers", {
			apiKey: answerAuthor.apiKey,
			body: {
				bodyMarkdown: "Body",
				questionId: question.payload.id,
			},
			method: "POST",
		});

		expectStructuredError(
			missingAuthor.payload,
			400,
			missingAuthor.response,
			"BAD_REQUEST",
			"author",
		);
	});

	test("POST /cli/votes supports valid votes and maps invalid or forbidden votes to structured errors", async () => {
		const t = createTestBackend();
		const questionAuthor = await createIdentity(t, "Vote Author");
		const voter = await createIdentity(t, "Vote Reader");
		const question = await createQuestion(t, questionAuthor.apiKey, {
			author: authorSnapshot(questionAuthor),
			bodyMarkdown: "Vote target body",
			title: "Vote target question",
		});

		const success = await requestJson<{
			score: number;
			targetId: string;
			targetType: "question";
			vote: 1 | -1;
		}>(t, "/cli/votes", {
			apiKey: voter.apiKey,
			body: {
				targetId: question.payload.id,
				targetType: "question",
				value: 1,
			},
			method: "POST",
		});

		expect(success.response.status).toBe(200);
		expect(success.payload).toEqual({
			score: 1,
			targetId: question.payload.id,
			targetType: "question",
			vote: 1,
		});

		const invalidVote = await requestJson<{
			code: string;
			error: string;
		}>(t, "/cli/votes", {
			apiKey: voter.apiKey,
			body: {
				targetId: question.payload.id,
				targetType: "question",
				value: 0,
			},
			method: "POST",
		});
		expectStructuredError(
			invalidVote.payload,
			400,
			invalidVote.response,
			"BAD_REQUEST",
		);

		const selfVote = await requestJson<{
			code: string;
			error: string;
		}>(t, "/cli/votes", {
			apiKey: questionAuthor.apiKey,
			body: {
				targetId: question.payload.id,
				targetType: "question",
				value: 1,
			},
			method: "POST",
		});
		expectStructuredError(
			selfVote.payload,
			403,
			selfVote.response,
			"FORBIDDEN",
			"self-votes",
		);
	});

	test("end-to-end write flow covers whoami, question creation, answer creation, voting, and derived field updates", async () => {
		const t = createTestBackend();
		const author = await createIdentity(t, "Flow Author");
		const voter = await createIdentity(t, "Flow Voter");

		const whoami = await requestJson<{
			apiKey: {
				id: string;
				referenceId: string;
			};
			user: {
				email: string;
				id: string;
				name: string;
			};
		}>(t, "/cli/auth/whoami", {
			apiKey: author.apiKey,
			method: "POST",
		});
		expect(whoami.response.status).toBe(200);
		expect(whoami.payload).toMatchObject({
			apiKey: {
				id: author.apiKeyId,
				referenceId: author.userId,
			},
			user: {
				email: author.email,
				id: author.userId,
				name: author.userName,
			},
		});

		const question = await createQuestion(t, author.apiKey, {
			author: authorSnapshot(author),
			bodyMarkdown: "Document the contract suite for this backend.",
			tagSlugs: ["backend", "contract"],
			title: "How should I verify backend contracts?",
		});
		expect(question.response.status).toBe(201);
		expect(question.payload).toMatchObject({
			author: authorSnapshot(author),
			createdAt: expect.any(Number),
			id: expect.any(String),
			slug: "how-should-i-verify-backend-contracts",
		});

		const answer = await requestJson<{
			author: {
				description: string;
				name: string;
				owner: string;
				slug: string;
			};
			createdAt: number;
			id: string;
			questionId: string;
		}>(t, "/cli/answers", {
			apiKey: author.apiKey,
			body: {
				author: authorSnapshot(author),
				bodyMarkdown:
					"Hit the public HTTP routes and assert the returned JSON.",
				questionId: question.payload.id,
			},
			method: "POST",
		});
		expect(answer.response.status).toBe(201);
		expect(answer.payload).toMatchObject({
			author: authorSnapshot(author),
			createdAt: expect.any(Number),
			id: expect.any(String),
			questionId: question.payload.id,
		});

		const vote = await requestJson<{
			score: number;
			targetId: string;
			targetType: "answer";
			vote: 1 | -1;
		}>(t, "/cli/votes", {
			apiKey: voter.apiKey,
			body: {
				targetId: answer.payload.id,
				targetType: "answer",
				value: 1,
			},
			method: "POST",
		});
		expect(vote.response.status).toBe(200);
		expect(vote.payload).toEqual({
			score: 1,
			targetId: answer.payload.id,
			targetType: "answer",
			vote: 1,
		});

		const detail = await requestJson<{
			answerCount: number;
			answers: Array<{
				bodyMarkdown: string;
				id: string;
				score: number;
			}>;
			hasAnswers: boolean;
			id: string;
			slug: string;
			topAnswerScore: number | null;
		}>(t, `/cli/questions/${question.payload.slug}`);
		expect(detail.response.status).toBe(200);
		expect(detail.payload).toMatchObject({
			answerCount: 1,
			hasAnswers: true,
			id: question.payload.id,
			slug: question.payload.slug,
			topAnswerScore: 1,
		});
		expect(detail.payload.answers).toEqual([
			expect.objectContaining({
				bodyMarkdown:
					"Hit the public HTTP routes and assert the returned JSON.",
				id: answer.payload.id,
				score: 1,
			}),
		]);

		const search = await requestJson<
			Array<{
				answerCount: number;
				hasAnswers: boolean;
				id: string;
				slug: string;
				topAnswerScore: number | null;
			}>
		>(t, "/questions/search?q=title:verify&limit=5");
		expect(search.response.status).toBe(200);
		expect(search.payload).toContainEqual(
			expect.objectContaining({
				answerCount: 1,
				hasAnswers: true,
				id: question.payload.id,
				slug: question.payload.slug,
				topAnswerScore: 1,
			}),
		);
	});
});
