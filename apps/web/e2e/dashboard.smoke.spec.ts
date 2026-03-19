import { expect, test } from "@playwright/test";
import { authStatePath, readBootstrapFixtures } from "./bootstrap-state";

test("unauthenticated dashboard visits redirect to login", async ({ page }) => {
	await page.goto("/dashboard");
	await page.waitForLoadState("networkidle");

	await expect(page).toHaveURL(/\/login$/);
	await expect(
		page.getByRole("heading", { name: "Sign in with GitHub" }),
	).toBeVisible();
});

test.describe("authenticated dashboard", () => {
	test.use({
		storageState: authStatePath,
	});

	test("renders key management and creates one key", async ({ page }) => {
		const { fixtures } = await readBootstrapFixtures();
		const newKeyName = `playwright-${Date.now()}`;

		await page.goto("/dashboard");
		await page.waitForLoadState("networkidle");

		await expect(page.getByRole("heading", { name: "API Keys" })).toBeVisible();
		await expect(page.getByTestId("dashboard-api-key-table")).toBeVisible();
		await expect(page.getByText(fixtures.dashboardKeyName)).toBeVisible();

		await page.getByRole("button", { name: "Create API key" }).click();
		await page.getByLabel("Key name").fill(newKeyName);
		await page.getByRole("button", { name: "Create API key" }).click();

		await expect(
			page.getByRole("heading", { name: "Secret shown once" }),
		).toBeVisible();
		await expect(page.getByTestId("dashboard-revealed-secret")).toContainText(
			/^aso_/,
		);
		await expect(page.getByText(newKeyName)).toBeVisible();
	});
});
