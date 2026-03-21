import { convexTest } from "convex-test";
import { afterAll, beforeEach, describe, expect, test } from "vitest";
import { api } from "../convex/_generated/api";
import betterAuthSchema from "../convex/betterAuth/schema";
import {
	E2E_DETAIL_ANSWER,
	E2E_DETAIL_QUESTION,
	E2E_SEARCH_OTHER_QUESTION,
	E2E_SEARCH_TAGGED_QUESTION,
} from "../convex/e2eFixtures";
import schema from "../convex/schema";

const originalEnv = {
	E2E_TEST_MODE: process.env.E2E_TEST_MODE,
	E2E_TEST_SECRET: process.env.E2E_TEST_SECRET,
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

beforeEach(() => {
	process.env.E2E_TEST_MODE = "1";
	process.env.E2E_TEST_SECRET = "smoke-secret";
	process.env.GITHUB_CLIENT_ID = "test-github-client-id";
	process.env.GITHUB_CLIENT_SECRET = "test-github-client-secret";
	delete process.env.OPENAI_API_KEY;
	delete process.env.OPENAI_BASE_URL;
	delete process.env.OPENAI_EMBEDDING_MODEL;
	process.env.SITE_URL = "http://127.0.0.1:3000";
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

describe("E2E bootstrap fixtures", () => {
	test("rejects requests when the helper is disabled", async () => {
		process.env.E2E_TEST_MODE = "0";
		const t = createTestBackend();

		await expect(
			t.mutation(api.e2e.bootstrapFixtures, {
				secret: "smoke-secret",
			}),
		).rejects.toThrow("E2E test helpers are disabled");
	});

	test("rejects requests with an invalid secret", async () => {
		const t = createTestBackend();

		await expect(
			t.mutation(api.e2e.bootstrapFixtures, {
				secret: "not-the-right-secret",
			}),
		).rejects.toThrow("Invalid E2E test secret");
	});

	test("creates stable fixtures without duplicating forum data", async () => {
		const t = createTestBackend();

		const first = await t.mutation(api.e2e.bootstrapFixtures, {
			secret: "smoke-secret",
		});
		const second = await t.mutation(api.e2e.bootstrapFixtures, {
			secret: "smoke-secret",
		});

		expect(second).toEqual(first);

		const stats = await t.query(api.forum.getHomepageStats, {});
		expect(stats).toMatchObject({
			answers: 1,
			questions: 4,
		});

		const taggedQuestions = await t.query(api.forum.listQuestions, {
			sort: "top",
			tag: first.fixtures.tagSlug,
		});
		expect(
			taggedQuestions.map((question: { slug: string }) => question.slug).sort(),
		).toEqual(
			[E2E_DETAIL_QUESTION.slug, E2E_SEARCH_TAGGED_QUESTION.slug].sort(),
		);

		const searchResults = await t.action(api.forum.searchQuestions, {
			q: `body:"${first.fixtures.searchQuery}"`,
		});
		expect(
			searchResults.map((question: { slug: string }) => question.slug).sort(),
		).toEqual(
			[E2E_SEARCH_OTHER_QUESTION.slug, E2E_SEARCH_TAGGED_QUESTION.slug].sort(),
		);

		const detail = await t.query(api.forum.getQuestionDetail, {
			slug: first.fixtures.detailSlug,
		});
		expect(detail).toMatchObject({
			slug: E2E_DETAIL_QUESTION.slug,
			bodyMarkdown: E2E_DETAIL_QUESTION.bodyMarkdown,
			author: {
				owner: "OpenAI",
			},
			runMetadata: {
				model: E2E_DETAIL_QUESTION.runMetadata.model,
				provider: E2E_DETAIL_QUESTION.runMetadata.provider,
				runId: E2E_DETAIL_QUESTION.runMetadata.runId,
			},
		});
		expect(detail?.answers).toHaveLength(1);
		expect(detail?.answers[0]).toMatchObject({
			bodyMarkdown: E2E_DETAIL_ANSWER.bodyMarkdown,
			runMetadata: {
				model: E2E_DETAIL_ANSWER.runMetadata.model,
				provider: E2E_DETAIL_ANSWER.runMetadata.provider,
				runId: E2E_DETAIL_ANSWER.runMetadata.runId,
			},
		});
	});
});
