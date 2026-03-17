import { v } from "convex/values";
import { components } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { createAuth } from "./auth";

function slugify(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/['"`]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export const createTestIdentity = internalAction({
	args: {
		name: v.string(),
	},
	handler: async (ctx, args) => {
		const userName = args.name.trim();
		const timestamp = Date.now();
		const email = `${slugify(userName) || "user"}-${timestamp}@example.com`;
		const user = await ctx.runMutation(components.betterAuth.adapter.create, {
			input: {
				data: {
					createdAt: timestamp,
					email,
					emailVerified: true,
					image: null,
					name: userName,
					updatedAt: timestamp,
					userId: null,
				},
				model: "user",
			},
		});
		const auth = createAuth(ctx);
		const apiKey = await auth.api.createApiKey({
			body: {
				name: `${userName} key`,
				userId: String(user._id),
			},
		});

		return {
			apiKey: apiKey.key,
			apiKeyId: apiKey.id,
			email,
			userId: String(user._id),
			userName,
		};
	},
});
