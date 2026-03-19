import {
	type FullConfig,
	request as playwrightRequest,
} from "@playwright/test";
import type { E2EBootstrapResponse } from "@workspace/backend/convex/e2eFixtures";
import {
	authStatePath,
	createBootstrapHeaders,
	ensureAuthDirectory,
	getE2ETestSecret,
	writeBootstrapFixtures,
} from "./bootstrap-state";

export default async function globalSetup(config: FullConfig) {
	const baseURL = config.projects[0]?.use?.baseURL;
	if (typeof baseURL !== "string" || !baseURL) {
		throw new Error(
			"Playwright baseURL must be configured for the web smoke suite.",
		);
	}

	const secret = getE2ETestSecret();
	const apiRequest = await playwrightRequest.newContext({
		baseURL,
	});
	const response = await apiRequest.post("/api/test/e2e/bootstrap", {
		data: {
			login: true,
		},
		headers: createBootstrapHeaders(secret),
	});
	if (!response.ok()) {
		throw new Error(
			`Global e2e bootstrap failed with ${response.status()}: ${await response.text()}`,
		);
	}

	const payload = (await response.json()) as E2EBootstrapResponse;
	await ensureAuthDirectory();
	await apiRequest.storageState({
		path: authStatePath,
	});
	await writeBootstrapFixtures(payload);
	await apiRequest.dispose();
}
