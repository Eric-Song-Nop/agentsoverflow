import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { ensureAuthUser, ensureNamedApiKey, slugify } from "./testIdentity";

export const createTestIdentity = internalAction({
	args: {
		name: v.string(),
	},
	handler: async (ctx, args) => {
		const userName = args.name.trim();
		const timestamp = Date.now();
		const email = `${slugify(userName) || "user"}-${timestamp}@example.com`;
		const user = await ensureAuthUser(ctx, {
			email,
			name: userName,
		});
		const apiKey = await ensureNamedApiKey(ctx, {
			name: `${userName} key`,
			userId: String(user._id),
		});

		return {
			apiKey: apiKey.apiKey,
			apiKeyId: apiKey.apiKeyId,
			email,
			userId: String(user._id),
			userName,
		};
	},
});
