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

test("homepage renders the unified list surface without the old sidebars or nav", async ({
	page,
}) => {
	const { fixtures } = await readBootstrapFixtures();

	await page.goto("/");
	await page.waitForLoadState("networkidle");

	await expect(
		page.getByRole("heading", { name: "All Questions" }),
	).toBeVisible();
	await expect(page.getByText(fixtures.homepageTitle)).toBeVisible();
	await expect(
		page.getByRole("textbox", { name: "Search all questions" }),
	).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Agentsoverflow" }),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Archive Stats" }),
	).toHaveCount(0);
	await expect(page.getByRole("heading", { name: "Popular Tags" })).toHaveCount(
		0,
	);
	await expect(
		page.getByRole("heading", { name: "Featured Threads" }),
	).toHaveCount(0);
	await expect(page.getByRole("link", { name: "Feed" })).toHaveCount(0);
	await expect(page.getByRole("link", { name: "Search" })).toHaveCount(0);
	await expect(page.getByRole("link", { name: "Tags" })).toHaveCount(0);
});

test("header search drives the unified search results view", async ({
	page,
}) => {
	const { fixtures } = await readBootstrapFixtures();
	const constrainedQuery = `body:"${fixtures.searchQuery}"`;

	await page.goto("/");
	await page.waitForLoadState("networkidle");

	await page
		.getByRole("textbox", { name: "Search all questions" })
		.fill(constrainedQuery);
	await page.getByRole("button", { name: "Submit search" }).click();
	await page.waitForLoadState("networkidle");

	await expect(page).toHaveURL(
		new RegExp(`\\/?\\?q=${encodeURIComponent(constrainedQuery)}`),
	);
	await expect(
		page.getByRole("heading", { name: "Search Results" }),
	).toBeVisible();
	await expect(
		page.getByText(`Results for "${constrainedQuery}"`),
	).toBeVisible();
	await expect(
		page.getByText(`${E2E_TEST_SEARCH_RESULT_COUNT} results`),
	).toBeVisible();
	await expect(page.getByText(E2E_SEARCH_TAGGED_QUESTION.title)).toBeVisible();
	await expect(page.getByText(E2E_SEARCH_OTHER_QUESTION.title)).toBeVisible();
	await expect(page.getByRole("link", { name: "Clear search" })).toBeVisible();
});

test("direct search loads and client-side clear search returns to the feed", async ({
	page,
}) => {
	const { fixtures } = await readBootstrapFixtures();
	const constrainedQuery = `body:"${fixtures.searchQuery}"`;

	await page.goto(`/?q=${encodeURIComponent(constrainedQuery)}`);
	await page.waitForLoadState("networkidle");

	await expect(
		page.getByRole("heading", { name: "Search Results" }),
	).toBeVisible();
	await page.getByRole("link", { name: "Clear search" }).click();
	await page.waitForLoadState("networkidle");

	await expect(page).toHaveURL(/\/$/);
	await expect(
		page.getByRole("heading", { name: "All Questions" }),
	).toBeVisible();
	await expect(page.getByText(fixtures.homepageTitle)).toBeVisible();
});

test("logo click from search mode resets the root page back to the feed", async ({
	page,
}) => {
	const { fixtures } = await readBootstrapFixtures();
	const constrainedQuery = `body:"${fixtures.searchQuery}"`;

	await page.goto(`/?q=${encodeURIComponent(constrainedQuery)}`);
	await page.waitForLoadState("networkidle");

	await page.getByRole("link", { name: "Agentsoverflow" }).click();
	await page.waitForLoadState("networkidle");

	await expect(page).toHaveURL(/\/$/);
	await expect(
		page.getByRole("heading", { name: "All Questions" }),
	).toBeVisible();
});

test("tag chips switch the unified page into search mode", async ({ page }) => {
	const { fixtures } = await readBootstrapFixtures();
	const constrainedQuery = `body:"${fixtures.searchQuery}"`;
	const constrainedTagQuery = `${constrainedQuery} tag:${fixtures.tagSlug}`;

	await page.goto(`/?q=${encodeURIComponent(constrainedTagQuery)}`);
	await page.waitForLoadState("networkidle");
	await expect(
		page.getByText(`${E2E_TEST_FILTERED_RESULT_COUNT} result`),
	).toBeVisible();
	await expect(page.getByText(E2E_SEARCH_TAGGED_QUESTION.title)).toBeVisible();
	await expect(
		page.getByText(E2E_SEARCH_OTHER_QUESTION.title),
	).not.toBeVisible();

	await page.goto("/");
	await page.waitForLoadState("networkidle");
	await page.getByRole("link", { name: E2E_TEST_TAG_SLUG }).first().click();
	await page.waitForLoadState("networkidle");

	await expect(page).toHaveURL(
		new RegExp(`\\/?\\?q=${encodeURIComponent(`tag:${E2E_TEST_TAG_SLUG}`)}`),
	);
	await expect(
		page.getByRole("heading", { name: "Search Results" }),
	).toBeVisible();
	await expect(page.getByText(E2E_SEARCH_TAGGED_QUESTION.title)).toBeVisible();
});

test("legacy search and tag routes redirect into the home surface", async ({
	page,
}) => {
	const { fixtures } = await readBootstrapFixtures();

	await page.goto(`/search?q=${encodeURIComponent(`tag:${fixtures.tagSlug}`)}`);
	await page.waitForLoadState("networkidle");
	await expect(page).toHaveURL(
		new RegExp(`\\/?\\?q=${encodeURIComponent(`tag:${fixtures.tagSlug}`)}`),
	);

	await page.goto("/tags");
	await page.waitForLoadState("networkidle");
	await expect(page).toHaveURL(/\/$/);

	await page.goto(`/tags/${fixtures.tagSlug}`);
	await page.waitForLoadState("networkidle");
	await expect(page).toHaveURL(
		new RegExp(`\\/?\\?q=${encodeURIComponent(`tag:${fixtures.tagSlug}`)}`),
	);
	await expect(page.getByText(E2E_SEARCH_TAGGED_QUESTION.title)).toBeVisible();
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

	await page.getByRole("link", { name: E2E_TEST_TAG_SLUG }).click();
	await page.waitForLoadState("networkidle");
	await expect(page).toHaveURL(
		new RegExp(`\\/?\\?q=${encodeURIComponent(`tag:${E2E_TEST_TAG_SLUG}`)}`),
	);
	await expect(
		page.getByRole("heading", { name: "Search Results" }),
	).toBeVisible();
});
