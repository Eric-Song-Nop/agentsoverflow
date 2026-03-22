import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compileExecutable, getHostReleaseTarget } from "../scripts/build";

let compiledBinaryPath = "";
let smokeServer: Bun.Server<undefined> | null = null;
let smokeServerUrl = "";
let smokeTempDir = "";

beforeAll(async () => {
	smokeTempDir = await mkdtemp(join(tmpdir(), "agentsoverflow-cli-binary-"));
	compiledBinaryPath = await compileExecutable(
		getHostReleaseTarget(),
		join(
			smokeTempDir,
			`agentsoverflow${process.platform === "win32" ? ".exe" : ""}`,
		),
	);

	smokeServer = Bun.serve({
		fetch(request) {
			const url = new URL(request.url);
			if (url.pathname === "/cli/auth/whoami") {
				return new Response(
					JSON.stringify({
						apiKeyId: "key_binary",
						user: {
							id: "user_binary",
						},
					}),
					{
						headers: {
							"content-type": "application/json",
						},
						status: 200,
					},
				);
			}

			if (url.pathname === "/questions/search") {
				return new Response(
					JSON.stringify([
						{
							id: "q_binary",
							slug: "bun-search",
						},
					]),
					{
						headers: {
							"content-type": "application/json",
						},
						status: 200,
					},
				);
			}

			return new Response("Not Found", { status: 404 });
		},
		port: 0,
	});
	smokeServerUrl = `http://127.0.0.1:${smokeServer.port}`;
});

afterAll(async () => {
	smokeServer?.stop(true);
	if (smokeTempDir) {
		await rm(smokeTempDir, { force: true, recursive: true });
	}
});

describe("compiled binary smoke test", () => {
	test("compiled binary serves help and mocked whoami flow", async () => {
		const helpResult = Bun.spawnSync({
			cmd: [compiledBinaryPath, "--help"],
			stderr: "pipe",
			stdout: "pipe",
		});

		expect(helpResult.exitCode).toBe(0);
		expect(helpResult.stdout.toString()).toContain("Agentsoverflow CLI");

		const whoAmIResult = Bun.spawnSync({
			cmd: [
				compiledBinaryPath,
				"auth",
				"whoami",
				"--base-url",
				smokeServerUrl,
				"--api-key",
				"aso_binary",
			],
			stderr: "pipe",
			stdout: "pipe",
		});

		expect(whoAmIResult.exitCode).toBe(0);
		expect(JSON.parse(whoAmIResult.stdout.toString())).toEqual({
			apiKeyId: "key_binary",
			user: {
				id: "user_binary",
			},
		});
		expect(whoAmIResult.stderr.toString()).toBe("");

		const searchResult = Bun.spawnSync({
			cmd: [
				compiledBinaryPath,
				"questions",
				"search",
				"--base-url",
				smokeServerUrl,
				"--q",
				"bun",
			],
			stderr: "pipe",
			stdout: "pipe",
		});

		expect(searchResult.exitCode).toBe(0);
		expect(JSON.parse(searchResult.stdout.toString())).toEqual([
			{
				id: "q_binary",
				slug: "bun-search",
			},
		]);
		expect(searchResult.stderr.toString()).toBe("");
	});
});
