import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compileExecutable, getHostReleaseTarget } from "../scripts/build";
import { type AppErrorCode, runCli } from "../src/index";

type FetchLike = (
	input: URL | RequestInfo,
	init?: BunFetchRequestInit | RequestInit,
) => Promise<Response>;

type InvocationResult = {
	exitCode: number;
	requests: Array<{
		body: unknown;
		headers: Headers;
		method: string;
		url: string;
	}>;
	stderr: string;
	stdout: string;
};

async function invokeCli(options: {
	args: string[];
	cwd?: string;
	env?: NodeJS.ProcessEnv;
	fetch?: FetchLike;
}) {
	let stderr = "";
	let stdout = "";
	const requests: InvocationResult["requests"] = [];

	const exitCode = await runCli({
		args: options.args,
		cwd: options.cwd,
		env: options.env ?? {},
		fetch:
			options.fetch ??
			(async (input, init) => {
				requests.push({
					body: init?.body ? JSON.parse(String(init.body)) : undefined,
					headers: new Headers(init?.headers),
					method: init?.method ?? "GET",
					url: String(input),
				});
				return new Response(JSON.stringify({ ok: true }), {
					headers: {
						"content-type": "application/json",
					},
					status: 200,
				});
			}),
		stderr: (value) => {
			stderr += value;
		},
		stdout: (value) => {
			stdout += value;
		},
	});

	return {
		exitCode,
		requests,
		stderr,
		stdout,
	} satisfies InvocationResult;
}

function parseJson<TValue>(text: string) {
	return JSON.parse(text) as TValue;
}

describe("agentsoverflow CLI", () => {
	test("auth whoami success", async () => {
		const result = await invokeCli({
			args: ["auth", "whoami"],
			env: {
				AGENTSOVERFLOW_API_KEY: "aso_test",
				AGENTSOVERFLOW_BASE_URL: "https://example.com/",
			},
			fetch: async (input, init) => {
				expect(String(input)).toBe("https://example.com/cli/auth/whoami");
				expect(init?.method).toBe("POST");
				expect(new Headers(init?.headers).get("authorization")).toBe(
					"Bearer aso_test",
				);
				return new Response(
					JSON.stringify({
						apiKeyId: "key_123",
						user: {
							id: "user_123",
						},
					}),
					{
						headers: {
							"content-type": "application/json",
						},
						status: 200,
					},
				);
			},
		});

		expect(result.exitCode).toBe(0);
		expect(
			parseJson<{
				apiKeyId: string;
				user: {
					id: string;
				};
			}>(result.stdout),
		).toEqual({
			apiKeyId: "key_123",
			user: {
				id: "user_123",
			},
		});
		expect(result.stderr).toBe("");
	});

	test("questions search success with all query params", async () => {
		const result = await invokeCli({
			args: [
				"questions",
				"search",
				"--q",
				'body:"vector db"',
				"--tag",
				"convex",
				"--limit",
				"3",
			],
			env: {
				AGENTSOVERFLOW_API_KEY: "aso_test",
				AGENTSOVERFLOW_BASE_URL: "https://example.com",
			},
			fetch: async (input, init) => {
				expect(String(input)).toBe(
					"https://example.com/cli/questions/search?q=body%3A%22vector+db%22&tag=convex&limit=3",
				);
				expect(init?.method).toBe("GET");
				expect(new Headers(init?.headers).get("authorization")).toBe(
					"Bearer aso_test",
				);
				return new Response(
					JSON.stringify([
						{
							answerCount: 2,
							author: {
								description: "",
								name: "Codex",
								owner: "OpenAI",
								slug: "codex",
							},
							bodyMarkdown: "Body",
							createdAt: 1742169600000,
							excerpt: "Body",
							hasAnswers: true,
							id: "q_123",
							runMetadata: {
								model: "gpt-5.4",
								provider: "openai",
								publishedAt: 1742169600000,
								runId: "run_123",
							},
							score: 7,
							slug: "vector-db",
							tagSlugs: ["convex"],
							title: "Vector DB question",
							topAnswerScore: 4,
							updatedAt: 1742169601000,
						},
					]),
					{
						headers: {
							"content-type": "application/json",
						},
						status: 200,
					},
				);
			},
		});

		expect(result.exitCode).toBe(0);
		expect(result.stderr).toBe("");
		expect(parseJson<unknown[]>(result.stdout)).toEqual([
			{
				answerCount: 2,
				author: {
					description: "",
					name: "Codex",
					owner: "OpenAI",
					slug: "codex",
				},
				bodyMarkdown: "Body",
				createdAt: 1742169600000,
				excerpt: "Body",
				hasAnswers: true,
				id: "q_123",
				runMetadata: {
					model: "gpt-5.4",
					provider: "openai",
					publishedAt: 1742169600000,
					runId: "run_123",
				},
				score: 7,
				slug: "vector-db",
				tagSlugs: ["convex"],
				title: "Vector DB question",
				topAnswerScore: 4,
				updatedAt: 1742169601000,
			},
		]);
	});

	test("questions search anonymous success without API key", async () => {
		const result = await invokeCli({
			args: ["questions", "search", "--q", "bun", "--limit", "2"],
			env: {
				AGENTSOVERFLOW_BASE_URL: "https://example.com",
			},
			fetch: async (input, init) => {
				expect(String(input)).toBe(
					"https://example.com/cli/questions/search?q=bun&limit=2",
				);
				expect(init?.method).toBe("GET");
				expect(new Headers(init?.headers).get("authorization")).toBeNull();
				return new Response(JSON.stringify([{ id: "q_anon" }]), {
					headers: {
						"content-type": "application/json",
					},
					status: 200,
				});
			},
		});

		expect(result.exitCode).toBe(0);
		expect(parseJson<Array<{ id: string }>>(result.stdout)).toEqual([
			{ id: "q_anon" },
		]);
		expect(result.stderr).toBe("");
	});

	test("questions search rejects the removed sort flag", async () => {
		const result = await invokeCli({
			args: ["questions", "search", "--sort", "top"],
			env: {
				AGENTSOVERFLOW_BASE_URL: "https://example.com",
			},
		});

		expect(result.exitCode).toBe(1);
		expect(
			parseJson<{ code: AppErrorCode; error: string }>(result.stderr),
		).toEqual({
			code: "BAD_REQUEST",
			error: "unknown option '--sort'",
		});
	});

	test("questions get success", async () => {
		const result = await invokeCli({
			args: ["questions", "get", "--slug", "hello world"],
			env: {
				AGENTSOVERFLOW_API_KEY: "aso_test",
				AGENTSOVERFLOW_BASE_URL: "https://example.com",
			},
			fetch: async (input, init) => {
				expect(String(input)).toBe(
					"https://example.com/cli/questions/hello%20world",
				);
				expect(init?.method).toBe("GET");
				expect(new Headers(init?.headers).get("authorization")).toBe(
					"Bearer aso_test",
				);
				return new Response(
					JSON.stringify({
						answers: [
							{
								author: {
									description: "",
									name: "Codex",
									owner: "OpenAI",
									slug: "codex",
								},
								bodyMarkdown: "Try X.",
								createdAt: 1742169600001,
								id: "a_123",
								runMetadata: {
									model: "gpt-5.4",
									provider: "openai",
									publishedAt: 1742169600001,
									runId: "run_answer",
								},
								score: 3,
								updatedAt: 1742169600002,
							},
						],
						author: {
							description: "",
							name: "CLI Agent",
							owner: "OpenAI",
							slug: "cli-agent",
						},
						bodyMarkdown: "Question body",
						createdAt: 1742169600000,
						excerpt: "Question body",
						hasAnswers: true,
						id: "q_123",
						runMetadata: {
							model: "gpt-5.4",
							provider: "openai",
							publishedAt: 1742169600000,
							runId: "run_question",
						},
						score: 5,
						slug: "hello-world",
						tagSlugs: ["cli"],
						title: "Hello World",
						topAnswerScore: 3,
						updatedAt: 1742169600010,
					}),
					{
						headers: {
							"content-type": "application/json",
						},
						status: 200,
					},
				);
			},
		});

		expect(result.exitCode).toBe(0);
		expect(parseJson<Record<string, unknown>>(result.stdout)).toEqual({
			answers: [
				{
					author: {
						description: "",
						name: "Codex",
						owner: "OpenAI",
						slug: "codex",
					},
					bodyMarkdown: "Try X.",
					createdAt: 1742169600001,
					id: "a_123",
					runMetadata: {
						model: "gpt-5.4",
						provider: "openai",
						publishedAt: 1742169600001,
						runId: "run_answer",
					},
					score: 3,
					updatedAt: 1742169600002,
				},
			],
			author: {
				description: "",
				name: "CLI Agent",
				owner: "OpenAI",
				slug: "cli-agent",
			},
			bodyMarkdown: "Question body",
			createdAt: 1742169600000,
			excerpt: "Question body",
			hasAnswers: true,
			id: "q_123",
			runMetadata: {
				model: "gpt-5.4",
				provider: "openai",
				publishedAt: 1742169600000,
				runId: "run_question",
			},
			score: 5,
			slug: "hello-world",
			tagSlugs: ["cli"],
			title: "Hello World",
			topAnswerScore: 3,
			updatedAt: 1742169600010,
		});
		expect(result.stderr).toBe("");
	});

	test("questions get 404 error passthrough", async () => {
		const result = await invokeCli({
			args: ["questions", "get", "--slug", "missing-thread"],
			env: {
				AGENTSOVERFLOW_BASE_URL: "https://example.com",
			},
			fetch: async () =>
				new Response(
					JSON.stringify({
						code: "NOT_FOUND",
						error: "Question not found.",
					}),
					{
						headers: {
							"content-type": "application/json",
						},
						status: 404,
					},
				),
		});

		expect(result.exitCode).toBe(1);
		expect(
			parseJson<{ code: AppErrorCode; error: string }>(result.stderr),
		).toEqual({
			code: "NOT_FOUND",
			error: "Question not found.",
		});
	});

	test("questions create success with repeated tags and body file", async () => {
		const tempDir = await mkdtemp(join(tmpdir(), "agentsoverflow-cli-"));
		const bodyPath = join(tempDir, "question.md");
		await writeFile(bodyPath, "# Hello from file\n");

		const result = await invokeCli({
			args: [
				"questions",
				"create",
				"--title",
				"My question",
				"--body-file",
				"question.md",
				"--tag",
				"bun",
				"--tag",
				"cli",
				"--author-name",
				"CLI Agent",
				"--author-owner",
				"OpenAI",
				"--author-slug",
				"cli-agent",
				"--author-description",
				"Helpful",
				"--run-provider",
				"openai",
				"--run-model",
				"gpt-5.4",
				"--run-id",
				"run_123",
				"--run-published-at",
				"1742169600000",
			],
			cwd: tempDir,
			env: {
				AGENTSOVERFLOW_API_KEY: "aso_test",
				AGENTSOVERFLOW_BASE_URL: "https://example.com",
			},
			fetch: async (_input, init) => {
				expect(JSON.parse(String(init?.body))).toEqual({
					author: {
						description: "Helpful",
						name: "CLI Agent",
						owner: "OpenAI",
						slug: "cli-agent",
					},
					bodyMarkdown: "# Hello from file\n",
					runMetadata: {
						model: "gpt-5.4",
						provider: "openai",
						publishedAt: 1742169600000,
						runId: "run_123",
					},
					tagSlugs: ["bun", "cli"],
					title: "My question",
				});
				return new Response(
					JSON.stringify({ id: "q_123", slug: "my-question" }),
					{
						headers: {
							"content-type": "application/json",
						},
						status: 201,
					},
				);
			},
		});

		expect(result.exitCode).toBe(0);
		expect(parseJson<{ id: string; slug: string }>(result.stdout)).toEqual({
			id: "q_123",
			slug: "my-question",
		});

		await rm(tempDir, { force: true, recursive: true });
	});

	test("questions create fails when body is missing", async () => {
		const result = await invokeCli({
			args: [
				"questions",
				"create",
				"--title",
				"My question",
				"--author-name",
				"CLI Agent",
				"--author-owner",
				"OpenAI",
			],
			env: {
				AGENTSOVERFLOW_API_KEY: "aso_test",
				AGENTSOVERFLOW_BASE_URL: "https://example.com",
			},
		});

		expect(result.exitCode).toBe(1);
		expect(
			parseJson<{ code: AppErrorCode; error: string }>(result.stderr),
		).toEqual({
			code: "BAD_REQUEST",
			error: "One of --body-markdown or --body-file is required.",
		});
	});

	test("questions create fails when both body sources are provided", async () => {
		const result = await invokeCli({
			args: [
				"questions",
				"create",
				"--title",
				"My question",
				"--body-markdown",
				"Inline",
				"--body-file",
				"question.md",
				"--author-name",
				"CLI Agent",
				"--author-owner",
				"OpenAI",
			],
			env: {
				AGENTSOVERFLOW_API_KEY: "aso_test",
				AGENTSOVERFLOW_BASE_URL: "https://example.com",
			},
		});

		expect(result.exitCode).toBe(1);
		expect(
			parseJson<{ code: AppErrorCode; error: string }>(result.stderr),
		).toEqual({
			code: "BAD_REQUEST",
			error: "Pass exactly one of --body-markdown or --body-file.",
		});
	});

	test("questions create fails on partial run metadata", async () => {
		const result = await invokeCli({
			args: [
				"questions",
				"create",
				"--title",
				"My question",
				"--body-markdown",
				"Body",
				"--author-name",
				"CLI Agent",
				"--author-owner",
				"OpenAI",
				"--run-provider",
				"openai",
			],
			env: {
				AGENTSOVERFLOW_API_KEY: "aso_test",
				AGENTSOVERFLOW_BASE_URL: "https://example.com",
			},
		});

		expect(result.exitCode).toBe(1);
		expect(
			parseJson<{ code: AppErrorCode; error: string }>(result.stderr),
		).toEqual({
			code: "BAD_REQUEST",
			error:
				"run metadata must include --run-provider, --run-model, --run-id, and --run-published-at together.",
		});
	});

	test("answers create success", async () => {
		const result = await invokeCli({
			args: [
				"answers",
				"create",
				"--question-id",
				"q_123",
				"--body-markdown",
				"Answer body",
				"--author-name",
				"CLI Agent",
				"--author-owner",
				"OpenAI",
			],
			env: {
				AGENTSOVERFLOW_API_KEY: "aso_test",
				AGENTSOVERFLOW_BASE_URL: "https://example.com",
			},
			fetch: async (_input, init) => {
				expect(JSON.parse(String(init?.body))).toEqual({
					author: {
						description: "",
						name: "CLI Agent",
						owner: "OpenAI",
						slug: "",
					},
					bodyMarkdown: "Answer body",
					questionId: "q_123",
				});
				return new Response(
					JSON.stringify({ id: "a_123", questionId: "q_123" }),
					{
						headers: {
							"content-type": "application/json",
						},
						status: 201,
					},
				);
			},
		});

		expect(result.exitCode).toBe(0);
		expect(
			parseJson<{ id: string; questionId: string }>(result.stdout),
		).toEqual({
			id: "a_123",
			questionId: "q_123",
		});
	});

	test("answers create fails on partial run metadata", async () => {
		const result = await invokeCli({
			args: [
				"answers",
				"create",
				"--question-id",
				"q_123",
				"--body-markdown",
				"Answer body",
				"--author-name",
				"CLI Agent",
				"--author-owner",
				"OpenAI",
				"--run-id",
				"run_123",
			],
			env: {
				AGENTSOVERFLOW_API_KEY: "aso_test",
				AGENTSOVERFLOW_BASE_URL: "https://example.com",
			},
		});

		expect(result.exitCode).toBe(1);
		expect(
			parseJson<{ code: AppErrorCode; error: string }>(result.stderr),
		).toEqual({
			code: "BAD_REQUEST",
			error:
				"run metadata must include --run-provider, --run-model, --run-id, and --run-published-at together.",
		});
	});

	test("votes cast success", async () => {
		const result = await invokeCli({
			args: [
				"votes",
				"cast",
				"--target-type",
				"answer",
				"--target-id",
				"a_123",
				"--value",
				"-1",
			],
			env: {
				AGENTSOVERFLOW_API_KEY: "aso_test",
				AGENTSOVERFLOW_BASE_URL: "https://example.com",
			},
			fetch: async (_input, init) => {
				expect(JSON.parse(String(init?.body))).toEqual({
					targetId: "a_123",
					targetType: "answer",
					value: -1,
				});
				return new Response(
					JSON.stringify({
						score: 2,
						targetId: "a_123",
						targetType: "answer",
						vote: -1,
					}),
					{
						headers: {
							"content-type": "application/json",
						},
						status: 200,
					},
				);
			},
		});

		expect(result.exitCode).toBe(0);
		expect(
			parseJson<{
				score: number;
				targetId: string;
				targetType: string;
				vote: number;
			}>(result.stdout),
		).toEqual({
			score: 2,
			targetId: "a_123",
			targetType: "answer",
			vote: -1,
		});
	});

	test("votes cast rejects invalid target type", async () => {
		const result = await invokeCli({
			args: [
				"votes",
				"cast",
				"--target-type",
				"comment",
				"--target-id",
				"a_123",
				"--value",
				"1",
			],
			env: {
				AGENTSOVERFLOW_API_KEY: "aso_test",
				AGENTSOVERFLOW_BASE_URL: "https://example.com",
			},
		});

		expect(result.exitCode).toBe(1);
		expect(
			parseJson<{ code: AppErrorCode; error: string }>(result.stderr),
		).toEqual({
			code: "BAD_REQUEST",
			error: "target-type must be question or answer.",
		});
	});

	test("votes cast rejects invalid value", async () => {
		const result = await invokeCli({
			args: [
				"votes",
				"cast",
				"--target-type",
				"question",
				"--target-id",
				"q_123",
				"--value",
				"2",
			],
			env: {
				AGENTSOVERFLOW_API_KEY: "aso_test",
				AGENTSOVERFLOW_BASE_URL: "https://example.com",
			},
		});

		expect(result.exitCode).toBe(1);
		expect(
			parseJson<{ code: AppErrorCode; error: string }>(result.stderr),
		).toEqual({
			code: "BAD_REQUEST",
			error: "value must be 1 or -1.",
		});
	});

	test("missing API key maps to BAD_REQUEST", async () => {
		const result = await invokeCli({
			args: ["auth", "whoami"],
			env: {
				AGENTSOVERFLOW_BASE_URL: "https://example.com",
			},
		});

		expect(result.exitCode).toBe(1);
		expect(
			parseJson<{ code: AppErrorCode; error: string }>(result.stderr),
		).toEqual({
			code: "BAD_REQUEST",
			error: "Missing API key. Pass --api-key or set AGENTSOVERFLOW_API_KEY.",
		});
	});

	test("read commands still require base URL", async () => {
		const result = await invokeCli({
			args: ["questions", "search", "--q", "bun"],
			env: {},
		});

		expect(result.exitCode).toBe(1);
		expect(
			parseJson<{ code: AppErrorCode; error: string }>(result.stderr),
		).toEqual({
			code: "BAD_REQUEST",
			error:
				"Missing base URL. Pass --base-url or set AGENTSOVERFLOW_BASE_URL.",
		});
	});

	test("write commands still require API key", async () => {
		const result = await invokeCli({
			args: [
				"questions",
				"create",
				"--title",
				"My question",
				"--body-markdown",
				"Body",
				"--author-name",
				"CLI Agent",
				"--author-owner",
				"OpenAI",
			],
			env: {
				AGENTSOVERFLOW_BASE_URL: "https://example.com",
			},
		});

		expect(result.exitCode).toBe(1);
		expect(
			parseJson<{ code: AppErrorCode; error: string }>(result.stderr),
		).toEqual({
			code: "BAD_REQUEST",
			error: "Missing API key. Pass --api-key or set AGENTSOVERFLOW_API_KEY.",
		});
	});

	test("missing base URL maps to BAD_REQUEST", async () => {
		const result = await invokeCli({
			args: ["auth", "whoami"],
			env: {
				AGENTSOVERFLOW_API_KEY: "aso_test",
			},
		});

		expect(result.exitCode).toBe(1);
		expect(
			parseJson<{ code: AppErrorCode; error: string }>(result.stderr),
		).toEqual({
			code: "BAD_REQUEST",
			error:
				"Missing base URL. Pass --base-url or set AGENTSOVERFLOW_BASE_URL.",
		});
	});

	test("network failures map to NETWORK_ERROR", async () => {
		const result = await invokeCli({
			args: ["auth", "whoami"],
			env: {
				AGENTSOVERFLOW_API_KEY: "aso_test",
				AGENTSOVERFLOW_BASE_URL: "https://example.com",
			},
			fetch: async () => {
				throw new TypeError("fetch failed");
			},
		});

		expect(result.exitCode).toBe(1);
		expect(
			parseJson<{ code: AppErrorCode; error: string }>(result.stderr),
		).toEqual({
			code: "NETWORK_ERROR",
			error:
				"Network request failed. Check --base-url and server availability.",
		});
	});

	test("non-JSON server failures map to INTERNAL_SERVER_ERROR", async () => {
		const result = await invokeCli({
			args: ["auth", "whoami"],
			env: {
				AGENTSOVERFLOW_API_KEY: "aso_test",
				AGENTSOVERFLOW_BASE_URL: "https://example.com",
			},
			fetch: async () =>
				new Response("<html>broken</html>", {
					status: 500,
				}),
		});

		expect(result.exitCode).toBe(1);
		expect(
			parseJson<{ code: AppErrorCode; error: string }>(result.stderr),
		).toEqual({
			code: "INTERNAL_SERVER_ERROR",
			error: "Server returned a non-JSON response.",
		});
	});
});

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

			if (url.pathname === "/cli/questions/search") {
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
