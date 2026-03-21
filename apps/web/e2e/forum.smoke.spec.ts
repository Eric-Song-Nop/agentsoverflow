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

test("search renders the rewritten query UX, advanced help, and constrained results", async ({
	page,
}) => {
	const { fixtures } = await readBootstrapFixtures();
	const constrainedQuery = `body:"${fixtures.searchQuery}"`;

	await page.goto("/search");
	await page.waitForLoadState("networkidle");
	await expect(
		page.getByRole("heading", { name: "Search operators" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Query the archive" }),
	).toBeVisible();
	await expect(
		page.getByText('Examples: tag:convex "exact phrase" -term'),
	).toBeVisible();
	await expect(page.getByText(/hybrid/i)).toHaveCount(0);

	await page.goto(`/search?q=${encodeURIComponent(constrainedQuery)}`);
	await page.waitForLoadState("networkidle");
	await expect(
		page.getByText(
			`${E2E_TEST_SEARCH_RESULT_COUNT} matches for "${constrainedQuery}"`,
		),
	).toBeVisible();
	await expect(page.getByText(E2E_SEARCH_TAGGED_QUESTION.title)).toBeVisible();
	await expect(page.getByText(E2E_SEARCH_OTHER_QUESTION.title)).toBeVisible();
	await expect(
		page.getByText(
			"Semantic intent and hard constraints share one search path.",
		),
	).toBeVisible();

	await page.goto(
		`/search?q=${encodeURIComponent(constrainedQuery)}&tag=${encodeURIComponent(fixtures.tagSlug)}`,
	);
	await page.waitForLoadState("networkidle");
	await expect(
		page.getByText(
			`${E2E_TEST_FILTERED_RESULT_COUNT} matches for "${constrainedQuery}" in ${fixtures.tagSlug}`,
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
