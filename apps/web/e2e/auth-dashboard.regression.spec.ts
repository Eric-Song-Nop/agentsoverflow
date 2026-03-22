import { expect, test } from "@playwright/test";
import { authStatePath } from "./bootstrap-state";

test.describe("authenticated auth and dashboard flows", () => {
	test.use({
		storageState: authStatePath,
	});

	test("authenticated users visiting login are redirected to dashboard", async ({
		page,
	}) => {
		await page.goto("/login");
		await page.waitForLoadState("networkidle");

		await expect(page).toHaveURL(/\/dashboard$/);
		await expect(page.getByRole("heading", { name: "API Keys" })).toBeVisible();
	});

	test("dashboard can create, revoke, and delete a key without leaving stale UI", async ({
		page,
	}) => {
		const keyName = `playwright-regression-${Date.now()}`;

		await page.goto("/dashboard");
		await page.waitForLoadState("networkidle");

		await page.getByRole("button", { name: "Create API key" }).click();
		await page.getByLabel("Key name").fill(keyName);
		await page.getByRole("button", { name: "Create API key" }).click();

		await expect(
			page.getByRole("heading", { name: "Secret shown once" }),
		).toBeVisible();
		await expect(page.getByText(keyName)).toBeVisible();

		const keyRow = page.locator("tr", { hasText: keyName });
		await expect(keyRow).toBeVisible();

		await keyRow.getByRole("button", { name: "Revoke" }).click();
		await expect(keyRow.getByText("Revoked")).toBeVisible();

		await keyRow.getByRole("button", { name: "Delete" }).click();
		await expect(keyRow).toHaveCount(0);
	});
});
