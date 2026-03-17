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
		return (await request.json()) as unknown;
	} catch {
		throw new Error("BAD_REQUEST:Request body must be valid JSON.");
	}
}

function ensureJsonObject(value: unknown) {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error("BAD_REQUEST:Request body must be a JSON object.");
	}

	return value as Record<string, unknown>;
}

function toErrorResponse(error: unknown) {
	const message =
		error instanceof Error
			? error.message
			: "INTERNAL_SERVER_ERROR:Unexpected error.";
	const separator = message.indexOf(":");
	const rawCode =
		separator >= 0 ? message.slice(0, separator) : "INTERNAL_SERVER_ERROR";
	const rawDetail =
		separator >= 0 ? message.slice(separator + 1).trim() : message;
	const isValidationError =
		rawCode === "ArgumentValidationError" ||
		rawCode === "ValidationError" ||
		/validation/i.test(rawCode) ||
		/validator/i.test(rawDetail) ||
		/value does not match/i.test(rawDetail) ||
		/object is missing/i.test(rawDetail) ||
		/invalid argument/i.test(rawDetail);
	const code = isValidationError ? "BAD_REQUEST" : rawCode;
	const detail = isValidationError
		? rawDetail || "Request body failed validation."
		: rawDetail || "Unexpected error.";
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
		const body = ensureJsonObject(await readJsonBody(request));
		const result = await ctx.runMutation(
			internal.forum.createQuestionFromApiKey,
			{ ...body, apiKey } as never,
		);
		return jsonResponse(result, 201);
	} catch (error) {
		return toErrorResponse(error);
	}
});

const createCliAnswer = httpAction(async (ctx, request) => {
	try {
		const apiKey = getBearerToken(request);
		const body = ensureJsonObject(await readJsonBody(request));
		const result = await ctx.runMutation(
			internal.forum.createAnswerFromApiKey,
			{ ...body, apiKey } as never,
		);
		return jsonResponse(result, 201);
	} catch (error) {
		return toErrorResponse(error);
	}
});

const createCliVote = httpAction(async (ctx, request) => {
	try {
		const apiKey = getBearerToken(request);
		const body = ensureJsonObject(await readJsonBody(request));
		const result = await ctx.runMutation(internal.forum.castVoteFromApiKey, {
			...body,
			apiKey,
		} as never);
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
