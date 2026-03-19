import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
	E2E_TEST_SECRET_ENV,
	type E2EBootstrapResponse,
} from "@workspace/backend/convex/e2eFixtures";

export const authDirectoryPath = path.resolve(import.meta.dirname, ".auth");
export const authStatePath = path.join(authDirectoryPath, "storage-state.json");
export const fixturesPath = path.join(authDirectoryPath, "fixtures.json");

export function getE2ETestSecret() {
	const secret = process.env[E2E_TEST_SECRET_ENV]?.trim();
	if (!secret) {
		throw new Error(
			`${E2E_TEST_SECRET_ENV} must be set before running Playwright.`,
		);
	}

	return secret;
}

export function createBootstrapHeaders(secret = getE2ETestSecret()) {
	return {
		"x-e2e-test-secret": secret,
	};
}

export async function ensureAuthDirectory() {
	await mkdir(authDirectoryPath, {
		recursive: true,
	});
}

export async function writeBootstrapFixtures(payload: E2EBootstrapResponse) {
	await ensureAuthDirectory();
	await writeFile(fixturesPath, JSON.stringify(payload, null, 2), "utf8");
}

export async function readBootstrapFixtures() {
	const raw = await readFile(fixturesPath, "utf8");
	return JSON.parse(raw) as E2EBootstrapResponse;
}
