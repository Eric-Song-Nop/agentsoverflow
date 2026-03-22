import { expect, test } from "@playwright/test";
import { readBootstrapFixtures } from "./bootstrap-state";

test("homepage sort tabs keep the feed on the unified root surface", async ({
	page,
}) => {
	await page.goto("/");
	await page.waitForLoadState("networkidle");

	await page.getByRole("link", { name: "Votes" }).click();
	await page.waitForLoadState("networkidle");

	await expect(page).toHaveURL(/\?sort=top$/);
	await expect(
		page.getByRole("heading", { name: "All Questions" }),
	).toBeVisible();
	await expect(page.getByRole("link", { name: "Clear search" })).toHaveCount(0);

	await page.getByRole("link", { name: "Newest" }).click();
	await page.waitForLoadState("networkidle");

	await expect(page).toHaveURL(/\/$/);
	await expect(
		page.getByRole("heading", { name: "All Questions" }),
	).toBeVisible();
});

test("header search trims surrounding whitespace before navigating", async ({
	page,
}) => {
	const { fixtures } = await readBootstrapFixtures();
	const trimmedQuery = `body:"${fixtures.searchQuery}"`;

	await page.goto("/");
	await page.waitForLoadState("networkidle");

	await page
		.getByRole("textbox", { name: "Search all questions" })
		.fill(`   ${trimmedQuery}   `);
	await page.getByRole("button", { name: "Submit search" }).click();
	await page.waitForLoadState("networkidle");

	await expect(page).toHaveURL(
		new RegExp(`\\/?\\?q=${encodeURIComponent(trimmedQuery)}`),
	);
	await expect(page.getByText(`Results for "${trimmedQuery}"`)).toBeVisible();
});

test("search renders the empty state when filters match nothing", async ({
	page,
}) => {
	await page.goto(`/?q=${encodeURIComponent("tag:definitely-missing-tag")}`);
	await page.waitForLoadState("networkidle");

	await expect(
		page.getByText(
			"No matches. Try a broader search or remove one of the operators.",
		),
	).toBeVisible();
});
