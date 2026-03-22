import { describe, expect, test } from "bun:test";
import { CLI_CONTRACT, CLI_ERROR_MESSAGES } from "../src/contract";
import type { AppErrorCode } from "../src/index";
import { createTempDir, invokeCli, jsonResponse, parseJson } from "./helpers";

describe("agentsoverflow CLI contract", () => {
	test("root help lists every supported command", async () => {
		const result = await invokeCli({
			args: ["--help"],
			env: {},
		});

		expect(result.exitCode).toBe(0);
		for (const command of CLI_CONTRACT.supportedCommands) {
			expect(result.stdout).toContain(command);
		}
		expect(result.stderr).toBe("");
	});

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
				return jsonResponse({
					apiKeyId: "key_123",
					user: {
						id: "user_123",
					},
				});
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
					"https://example.com/questions/search?q=body%3A%22vector+db%22&tag=convex&limit=3",
				);
				expect(init?.method).toBe("GET");
				expect(new Headers(init?.headers).get("authorization")).toBe(
					"Bearer aso_test",
				);
				return jsonResponse([
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
					"https://example.com/questions/search?q=bun&limit=2",
				);
				expect(init?.method).toBe("GET");
				expect(new Headers(init?.headers).get("authorization")).toBeNull();
				return jsonResponse([{ id: "q_anon" }]);
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
			error: CLI_ERROR_MESSAGES.removedSortFlag,
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
				return jsonResponse({
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
				jsonResponse(
					{
						code: "NOT_FOUND",
						error: CLI_ERROR_MESSAGES.questionNotFound,
					},
					{
						status: 404,
					},
				),
		});

		expect(result.exitCode).toBe(1);
		expect(
			parseJson<{ code: AppErrorCode; error: string }>(result.stderr),
		).toEqual({
			code: "NOT_FOUND",
			error: CLI_ERROR_MESSAGES.questionNotFound,
		});
	});

	test("questions create success with repeated tags and body file", async () => {
		const tempDir = await createTempDir({
			"question.md": "# Hello from file\n",
		});

		try {
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
				cwd: tempDir.cwd,
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
					return jsonResponse(
						{ id: "q_123", slug: "my-question" },
						{
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
		} finally {
			await tempDir.cleanup();
		}
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
			error: CLI_ERROR_MESSAGES.bodyInputRequired,
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
			error: CLI_ERROR_MESSAGES.bodyInputXor,
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
			error: CLI_ERROR_MESSAGES.partialRunMetadata,
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
				return jsonResponse(
					{ id: "a_123", questionId: "q_123" },
					{
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
			error: CLI_ERROR_MESSAGES.partialRunMetadata,
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
				return jsonResponse({
					score: 2,
					targetId: "a_123",
					targetType: "answer",
					vote: -1,
				});
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
			error: CLI_ERROR_MESSAGES.invalidVoteTarget,
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
			error: CLI_ERROR_MESSAGES.invalidVoteValue,
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
			error: CLI_ERROR_MESSAGES.missingApiKey,
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
			error: CLI_ERROR_MESSAGES.missingBaseUrl,
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
			error: CLI_ERROR_MESSAGES.missingApiKey,
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
			error: CLI_ERROR_MESSAGES.missingBaseUrl,
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
			error: CLI_ERROR_MESSAGES.networkFailure,
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
			error: CLI_ERROR_MESSAGES.nonJsonResponse,
		});
	});
});
