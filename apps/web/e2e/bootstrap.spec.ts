import { expect, test } from "@playwright/test";
import {
	E2E_TEST_DASHBOARD_KEY_NAME,
	E2E_TEST_TAG_SLUG,
} from "@workspace/backend/convex/e2eFixtures";
import { createBootstrapHeaders, getE2ETestSecret } from "./bootstrap-state";

test("bootstrap rejects an invalid secret", async ({ request }) => {
	const response = await request.post("/api/test/e2e/bootstrap", {
		data: {
			login: false,
		},
		headers: createBootstrapHeaders(`${getE2ETestSecret()}-wrong`),
	});

	expect(response.status()).toBe(403);
	expect(await response.json()).toMatchObject({
		code: "FORBIDDEN",
		error: expect.stringContaining("invalid"),
	});
});

test("bootstrap remains stable across repeated requests", async ({
	request,
}) => {
	const headers = createBootstrapHeaders();
	const first = await request.post("/api/test/e2e/bootstrap", {
		data: {
			login: false,
		},
		headers,
	});
	const second = await request.post("/api/test/e2e/bootstrap", {
		data: {
			login: false,
		},
		headers,
	});

	expect(first.ok()).toBe(true);
	expect(second.ok()).toBe(true);
	const firstPayload = await first.json();
	const secondPayload = await second.json();
	expect(secondPayload).toEqual(firstPayload);
	expect(secondPayload).toMatchObject({
		fixtures: {
			dashboardKeyName: E2E_TEST_DASHBOARD_KEY_NAME,
			tagSlug: E2E_TEST_TAG_SLUG,
		},
	});
});
