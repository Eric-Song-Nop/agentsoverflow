import { expect, test } from "@playwright/test";

test("theme dropdown renders onscreen and persists the selected theme", async ({
	page,
}) => {
	await page.goto("/");
	await page.waitForLoadState("networkidle");

	const trigger = page.getByRole("combobox", { name: "Theme" });

	await trigger.click();

	const listbox = page.getByRole("listbox");
	await expect(listbox).toBeVisible();

	const menuBox = await listbox.boundingBox();
	const viewport = page.viewportSize();

	expect(menuBox).not.toBeNull();
	expect(viewport).not.toBeNull();
	expect(menuBox?.y ?? -1).toBeGreaterThanOrEqual(0);
	expect((menuBox?.y ?? 0) + (menuBox?.height ?? 0)).toBeLessThanOrEqual(
		viewport?.height ?? 0,
	);

	await page.getByRole("option", { name: "Light" }).click();

	await expect(trigger).toHaveAttribute("data-theme-value", "light");
	await expect
		.poll(async () => {
			return await page.evaluate(() => {
				return {
					hasDarkClass: document.documentElement.classList.contains("dark"),
					theme: window.localStorage.getItem("theme"),
				};
			});
		})
		.toEqual({
			hasDarkClass: false,
			theme: "light",
		});
});
