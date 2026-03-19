import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	globalSetup: "./e2e/global-setup.ts",
	use: {
		baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
		headless: true,
		trace: "retain-on-failure",
	},
	outputDir: "./test-results",
	reporter: "list",
	workers: 1,
});
