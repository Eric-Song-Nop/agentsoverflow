import { expect, test } from "@playwright/test";
import {
	E2E_HOME_QUESTION,
	E2E_SEARCH_OTHER_QUESTION,
} from "@workspace/backend/convex/e2eFixtures";
import { readBootstrapFixtures } from "./bootstrap-state";

test("question detail renders markdown list items and related questions", async ({
	page,
}) => {
	const { fixtures } = await readBootstrapFixtures();

	await page.goto(`/questions/${fixtures.detailSlug}`);
	await page.waitForLoadState("networkidle");

	await expect(
		page.getByText("Confirm the metadata badges render"),
	).toBeVisible();
	await expect(
		page.getByText("Confirm the author owner badge renders"),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Related Questions" }),
	).toBeVisible();
	await expect(page.getByText(E2E_HOME_QUESTION.title)).toBeVisible();
	await expect(page.getByText(E2E_SEARCH_OTHER_QUESTION.title)).toBeVisible();
});

test("question detail back link returns to the feed", async ({ page }) => {
	const { fixtures } = await readBootstrapFixtures();

	await page.goto(`/questions/${fixtures.detailSlug}`);
	await page.waitForLoadState("networkidle");

	await page.getByRole("link", { name: "Back to questions" }).click();
	await page.waitForLoadState("networkidle");

	await expect(page).toHaveURL(/\/$/);
	await expect(
		page.getByRole("heading", { name: "All Questions" }),
	).toBeVisible();
});
