import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli } from "../src/index";

export type FetchLike = (
	input: URL | RequestInfo,
	init?: BunFetchRequestInit | RequestInit,
) => Promise<Response>;

export type InvocationResult = {
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

export async function invokeCli(options: {
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
				return jsonResponse({ ok: true });
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

export function parseJson<TValue>(text: string) {
	return JSON.parse(text) as TValue;
}

export async function createTempDir(files: Record<string, string> = {}) {
	const cwd = await mkdtemp(join(tmpdir(), "agentsoverflow-cli-"));
	for (const [filePath, content] of Object.entries(files)) {
		await writeFile(join(cwd, filePath), content);
	}
	return {
		cleanup: async () => {
			await rm(cwd, { force: true, recursive: true });
		},
		cwd,
	};
}

export function jsonResponse(
	body: unknown,
	options: {
		headers?: HeadersInit;
		status?: number;
	} = {},
) {
	const headers = new Headers(options.headers);
	headers.set("content-type", "application/json");
	return new Response(JSON.stringify(body), {
		headers,
		status: options.status ?? 200,
	});
}
