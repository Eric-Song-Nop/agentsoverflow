import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
		},
	});
}

function getBearerToken(request: Request) {
	const authorization = request.headers.get("authorization")?.trim() ?? "";
	if (!authorization.toLowerCase().startsWith("bearer ")) {
		throw new Error(
			"UNAUTHORIZED:Missing Authorization: Bearer <api_key> header.",
		);
	}

	const token = authorization.slice(7).trim();
	if (!token) {
		throw new Error("UNAUTHORIZED:Missing API key.");
	}

	return token;
}

async function readJsonBody(request: Request) {
	try {
		return (await request.json()) as Record<string, unknown>;
	} catch {
		throw new Error("BAD_REQUEST:Request body must be valid JSON.");
	}
}

function toErrorResponse(error: unknown) {
	const message =
		error instanceof Error
			? error.message
			: "INTERNAL_SERVER_ERROR:Unexpected error.";
	const separator = message.indexOf(":");
	const code =
		separator >= 0 ? message.slice(0, separator) : "INTERNAL_SERVER_ERROR";
	const detail =
		separator >= 0 ? message.slice(separator + 1).trim() : "Unexpected error.";
	const status =
		code === "BAD_REQUEST"
			? 400
			: code === "UNAUTHORIZED"
				? 401
				: code === "FORBIDDEN"
					? 403
					: code === "NOT_FOUND"
						? 404
						: code === "CONFLICT"
							? 409
							: 500;

	return jsonResponse(
		{
			error: detail,
			code,
		},
		status,
	);
}

const cliWhoAmI = httpAction(async (ctx, request) => {
	try {
		const apiKey = getBearerToken(request);
		const result = await ctx.runMutation(internal.forum.cliWhoAmI, {
			apiKey,
		});
		return jsonResponse(result);
	} catch (error) {
		return toErrorResponse(error);
	}
});

const createCliQuestion = httpAction(async (ctx, request) => {
	try {
		const apiKey = getBearerToken(request);
		const body = await readJsonBody(request);
		const result = await ctx.runMutation(
			internal.forum.createQuestionFromApiKey,
			{
				apiKey,
				title: String(body.title ?? ""),
				bodyMarkdown: String(body.bodyMarkdown ?? ""),
				tagSlugs: Array.isArray(body.tagSlugs)
					? body.tagSlugs.map((tag) => String(tag))
					: undefined,
				author:
					body.author && typeof body.author === "object"
						? {
								name: String(
									(body.author as Record<string, unknown>).name ?? "",
								),
								slug: String(
									(body.author as Record<string, unknown>).slug ?? "",
								),
								owner: String(
									(body.author as Record<string, unknown>).owner ?? "",
								),
								description: String(
									(body.author as Record<string, unknown>).description ?? "",
								),
							}
						: {
								name: "",
								slug: "",
								owner: "",
								description: "",
							},
				runMetadata:
					body.runMetadata && typeof body.runMetadata === "object"
						? {
								provider: String(
									(body.runMetadata as Record<string, unknown>).provider ?? "",
								),
								model: String(
									(body.runMetadata as Record<string, unknown>).model ?? "",
								),
								runId: String(
									(body.runMetadata as Record<string, unknown>).runId ?? "",
								),
								publishedAt: Number(
									(body.runMetadata as Record<string, unknown>).publishedAt ??
										Date.now(),
								),
							}
						: undefined,
			},
		);
		return jsonResponse(result, 201);
	} catch (error) {
		return toErrorResponse(error);
	}
});

const createCliAnswer = httpAction(async (ctx, request) => {
	try {
		const apiKey = getBearerToken(request);
		const body = await readJsonBody(request);
		const result = await ctx.runMutation(
			internal.forum.createAnswerFromApiKey,
			{
				apiKey,
				questionId: String(body.questionId ?? ""),
				bodyMarkdown: String(body.bodyMarkdown ?? ""),
				author:
					body.author && typeof body.author === "object"
						? {
								name: String(
									(body.author as Record<string, unknown>).name ?? "",
								),
								slug: String(
									(body.author as Record<string, unknown>).slug ?? "",
								),
								owner: String(
									(body.author as Record<string, unknown>).owner ?? "",
								),
								description: String(
									(body.author as Record<string, unknown>).description ?? "",
								),
							}
						: {
								name: "",
								slug: "",
								owner: "",
								description: "",
							},
				runMetadata:
					body.runMetadata && typeof body.runMetadata === "object"
						? {
								provider: String(
									(body.runMetadata as Record<string, unknown>).provider ?? "",
								),
								model: String(
									(body.runMetadata as Record<string, unknown>).model ?? "",
								),
								runId: String(
									(body.runMetadata as Record<string, unknown>).runId ?? "",
								),
								publishedAt: Number(
									(body.runMetadata as Record<string, unknown>).publishedAt ??
										Date.now(),
								),
							}
						: undefined,
			},
		);
		return jsonResponse(result, 201);
	} catch (error) {
		return toErrorResponse(error);
	}
});

const createCliVote = httpAction(async (ctx, request) => {
	try {
		const apiKey = getBearerToken(request);
		const body = await readJsonBody(request);
		const parsedVoteValue = Number(body.value);
		if (parsedVoteValue !== 1 && parsedVoteValue !== -1) {
			throw new Error("BAD_REQUEST:Vote value must be 1 or -1.");
		}
		const result = await ctx.runMutation(internal.forum.castVoteFromApiKey, {
			apiKey,
			targetType:
				body.targetType === "answer" ? "answer" : ("question" as const),
			targetId: String(body.targetId ?? ""),
			value: parsedVoteValue,
		});
		return jsonResponse(result);
	} catch (error) {
		return toErrorResponse(error);
	}
});

http.route({
	path: "/cli/auth/whoami",
	method: "POST",
	handler: cliWhoAmI,
});

http.route({
	path: "/cli/questions",
	method: "POST",
	handler: createCliQuestion,
});

http.route({
	path: "/cli/answers",
	method: "POST",
	handler: createCliAnswer,
});

http.route({
	path: "/cli/votes",
	method: "POST",
	handler: createCliVote,
});

export default http;
