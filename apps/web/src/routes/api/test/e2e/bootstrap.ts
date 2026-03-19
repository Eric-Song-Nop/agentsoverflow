import { createFileRoute } from "@tanstack/react-router";
import { api } from "@workspace/backend/convex/_generated/api";
import {
	buildE2ETestPassword,
	E2E_TEST_LOGIN_EMAIL,
	E2E_TEST_MODE_ENV,
	E2E_TEST_SECRET_ENV,
	type E2EBootstrapResponse,
	isE2ETestModeEnabled,
	isValidE2ETestSecret,
} from "@workspace/backend/convex/e2eFixtures";
import { splitSetCookieHeader } from "better-auth/cookies";
import { ConvexHttpClient } from "convex/browser";
import { handler as authHandler } from "../../../../lib/auth-server";

const E2E_TEST_SECRET_HEADER = "x-e2e-test-secret";

function getConvexUrl() {
	const convexUrl = process.env.VITE_CONVEX_URL?.trim();
	if (!convexUrl) {
		throw new Error("INTERNAL_SERVER_ERROR:VITE_CONVEX_URL is not configured.");
	}

	return convexUrl;
}

function createJsonResponse(
	body: unknown,
	status = 200,
	headers: Headers = new Headers(),
) {
	headers.set("content-type", "application/json; charset=utf-8");
	return new Response(JSON.stringify(body), {
		headers,
		status,
	});
}

function toErrorResponse(error: unknown) {
	const message =
		error instanceof Error
			? error.message
			: "INTERNAL_SERVER_ERROR:Unexpected error.";
	const separatorIndex = message.indexOf(":");
	const code =
		separatorIndex >= 0
			? message.slice(0, separatorIndex)
			: "INTERNAL_SERVER_ERROR";
	const detail =
		separatorIndex >= 0 ? message.slice(separatorIndex + 1) : message;
	const status =
		code === "BAD_REQUEST"
			? 400
			: code === "FORBIDDEN"
				? 403
				: code === "NOT_FOUND"
					? 404
					: 500;

	return createJsonResponse(
		{
			code,
			error: detail.trim() || "Unexpected error.",
		},
		status,
	);
}

async function readBootstrapBody(request: Request) {
	let payload: unknown;
	try {
		payload = (await request.json()) as unknown;
	} catch {
		throw new Error("BAD_REQUEST:Request body must be valid JSON.");
	}

	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		throw new Error("BAD_REQUEST:Request body must be a JSON object.");
	}

	const login =
		"login" in payload ? (payload as { login?: unknown }).login : undefined;
	if (login !== undefined && typeof login !== "boolean") {
		throw new Error("BAD_REQUEST:login must be a boolean when provided.");
	}

	return {
		login: login ?? false,
	};
}

function getE2ETestSecret(request: Request) {
	return request.headers.get(E2E_TEST_SECRET_HEADER)?.trim() ?? "";
}

async function signInForBrowserSession(
	request: Request,
	secret: string,
): Promise<Headers> {
	const requestUrl = new URL(request.url);
	const signInRequest = new Request(
		new URL("/api/auth/sign-in/email", request.url),
		{
			body: JSON.stringify({
				email: E2E_TEST_LOGIN_EMAIL,
				password: buildE2ETestPassword(secret),
			}),
			headers: new Headers({
				"content-type": "application/json",
				origin: requestUrl.origin,
				referer: requestUrl.origin,
				"user-agent": "agentsoverflow-e2e-bootstrap",
				"x-forwarded-host": requestUrl.host,
				"x-forwarded-proto": requestUrl.protocol.replace(":", ""),
			}),
			method: "POST",
		},
	);
	const authResponse = await authHandler(signInRequest);
	if (!authResponse.ok) {
		const detail = (await authResponse.text()).trim();
		throw new Error(
			`INTERNAL_SERVER_ERROR:E2E sign-in failed (${authResponse.status})${detail ? `: ${detail}` : ""}`,
		);
	}

	const setCookieHeader = authResponse.headers.get("set-cookie");
	const headers = new Headers();
	for (const value of splitSetCookieHeader(setCookieHeader ?? "")) {
		headers.append("set-cookie", value);
	}

	return headers;
}

export const Route = createFileRoute("/api/test/e2e/bootstrap")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				try {
					if (!isE2ETestModeEnabled()) {
						return createJsonResponse(
							{
								code: "NOT_FOUND",
								error: `${E2E_TEST_MODE_ENV} must be set to 1.`,
							},
							404,
						);
					}

					const secret = getE2ETestSecret(request);
					if (!isValidE2ETestSecret(secret)) {
						return createJsonResponse(
							{
								code: "FORBIDDEN",
								error: `${E2E_TEST_SECRET_ENV} is missing or invalid.`,
							},
							403,
						);
					}

					const { login } = await readBootstrapBody(request);
					const client = new ConvexHttpClient(getConvexUrl());
					const payload = (await client.mutation(api.e2e.bootstrapFixtures, {
						secret,
					})) as E2EBootstrapResponse;
					const headers = login
						? await signInForBrowserSession(request, secret)
						: new Headers();

					return createJsonResponse(payload, 200, headers);
				} catch (error) {
					return toErrorResponse(error);
				}
			},
		},
	},
});
