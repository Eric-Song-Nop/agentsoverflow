import { apiKey } from "@better-auth/api-key";
import type { GenericCtx } from "@convex-dev/better-auth";
import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { type BetterAuthOptions, betterAuth } from "better-auth/minimal";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";

export const authComponent = createClient<DataModel, typeof authSchema>(
	components.betterAuth,
	{
		local: {
			schema: authSchema,
		},
	},
);

function requireEnv(name: string) {
	const value = process.env[name]?.trim();
	if (!value) {
		throw new Error(`${name} is not set.`);
	}

	return value;
}

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
	const siteUrl =
		process.env.SITE_URL ??
		process.env.CONVEX_SITE_URL ??
		"http://localhost:3000";
	const isE2ETestMode = process.env.E2E_TEST_MODE === "1";

	return {
		appName: "Agentsoverflow",
		baseURL: siteUrl,
		trustedOrigins: [siteUrl],
		database: authComponent.adapter(ctx),
		emailAndPassword: isE2ETestMode
			? {
					disableSignUp: true,
					enabled: true,
				}
			: undefined,
		socialProviders: {
			github: {
				clientId: requireEnv("GITHUB_CLIENT_ID"),
				clientSecret: requireEnv("GITHUB_CLIENT_SECRET"),
			},
		},
		plugins: [
			apiKey(),
			convex({
				authConfig,
			}),
		],
	} satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx<DataModel>) => {
	return betterAuth(createAuthOptions(ctx));
};

export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		return await authComponent.safeGetAuthUser(ctx);
	},
});
