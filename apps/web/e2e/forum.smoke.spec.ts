import { expect, test } from "@playwright/test";
import {
	E2E_DETAIL_ANSWER,
	E2E_DETAIL_QUESTION,
	E2E_SEARCH_OTHER_QUESTION,
	E2E_SEARCH_TAGGED_QUESTION,
	E2E_TEST_FILTERED_RESULT_COUNT,
	E2E_TEST_SEARCH_RESULT_COUNT,
	E2E_TEST_TAG_SLUG,
} from "@workspace/backend/convex/e2eFixtures";
import { readBootstrapFixtures } from "./bootstrap-state";

test("homepage renders the seeded feed plus archive sidebars", async ({
	page,
}) => {
	const { fixtures } = await readBootstrapFixtures();

	await page.goto("/");
	await page.waitForLoadState("networkidle");

	await expect(
		page.getByRole("heading", { name: "Archive Stats" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Popular Tags" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Featured Threads" }),
	).toBeVisible();
	await expect(page.getByText(fixtures.homepageTitle)).toBeVisible();
	await expect(
		page.getByRole("link", { name: E2E_TEST_TAG_SLUG }),
	).toBeVisible();
});

test("search renders idle state, query results, and tag filtering", async ({
	page,
}) => {
	const { fixtures } = await readBootstrapFixtures();

	await page.goto("/search");
	await page.waitForLoadState("networkidle");
	await expect(
		page.getByRole("heading", { name: "Search the archive" }),
	).toBeVisible();

	await page.goto(`/search?q=${encodeURIComponent(fixtures.searchQuery)}`);
	await page.waitForLoadState("networkidle");
	await expect(
		page.getByText(
			`${E2E_TEST_SEARCH_RESULT_COUNT} results for "${fixtures.searchQuery}"`,
		),
	).toBeVisible();
	await expect(page.getByText(E2E_SEARCH_TAGGED_QUESTION.title)).toBeVisible();
	await expect(page.getByText(E2E_SEARCH_OTHER_QUESTION.title)).toBeVisible();

	await page.goto(
		`/search?q=${encodeURIComponent(fixtures.searchQuery)}&tag=${encodeURIComponent(fixtures.tagSlug)}`,
	);
	await page.waitForLoadState("networkidle");
	await expect(
		page.getByText(
			`${E2E_TEST_FILTERED_RESULT_COUNT} results for "${fixtures.searchQuery}" in ${fixtures.tagSlug}`,
		),
	).toBeVisible();
	await expect(page.getByText(E2E_SEARCH_TAGGED_QUESTION.title)).toBeVisible();
	await expect(
		page.getByText(E2E_SEARCH_OTHER_QUESTION.title),
	).not.toBeVisible();
});

test("tags index renders the seeded tag list", async ({ page }) => {
	await page.goto("/tags");
	await page.waitForLoadState("networkidle");

	await expect(page.getByRole("heading", { name: "All Tags" })).toBeVisible();
	await expect(
		page.getByRole("link", { name: E2E_TEST_TAG_SLUG }),
	).toBeVisible();
});

test("tag detail renders the selected tag and tagged fixtures", async ({
	page,
}) => {
	const { fixtures } = await readBootstrapFixtures();

	await page.goto(`/tags/${fixtures.tagSlug}`);
	await page.waitForLoadState("networkidle");

	await expect(
		page.getByRole("heading", {
			name: `Questions tagged [${fixtures.tagSlug}]`,
		}),
	).toBeVisible();
	await expect(page.getByText(E2E_SEARCH_TAGGED_QUESTION.title)).toBeVisible();
	await expect(page.getByText(E2E_DETAIL_QUESTION.title)).toBeVisible();
});

test("question detail renders title, body, answers, and metadata badges", async ({
	page,
}) => {
	const { fixtures } = await readBootstrapFixtures();

	await page.goto(`/questions/${fixtures.detailSlug}`);
	await page.waitForLoadState("networkidle");

	await expect(
		page.getByRole("heading", { name: E2E_DETAIL_QUESTION.title }),
	).toBeVisible();
	await expect(
		page.getByText("Question body for the e2e detail fixture."),
	).toBeVisible();
	await expect(page.getByRole("heading", { name: "1 Answers" })).toBeVisible();
	await expect(
		page.getByText("Answer body for the e2e detail fixture."),
	).toBeVisible();
	await expect(
		page.getByText(E2E_DETAIL_ANSWER.runMetadata.runId),
	).toBeVisible();
	await expect(page.getByText("openai / gpt-5.4")).toBeVisible();
	await expect(page.getByText("OpenAI")).toBeVisible();
});
