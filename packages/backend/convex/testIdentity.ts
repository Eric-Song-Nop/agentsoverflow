import type { GenericCtx } from "@convex-dev/better-auth";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import { createAuth } from "./auth";

type RunQueryFn = GenericCtx<DataModel>["runQuery"];
type RunMutationFn = Extract<
	GenericCtx<DataModel>,
	{
		runMutation: unknown;
	}
>["runMutation"];

export function slugify(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/['"`]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export async function findAuthUserByEmail(
	ctx: {
		runQuery: RunQueryFn;
	},
	email: string,
) {
	return (await ctx.runQuery(components.betterAuth.adapter.findOne, {
		model: "user",
		where: [
			{
				field: "email",
				value: email.trim().toLowerCase(),
			},
		],
	})) as {
		_id: string;
		email: string;
		emailVerified: boolean;
		image: string | null;
		name: string;
		updatedAt: number;
		userId: string | null;
	} | null;
}

export async function ensureAuthUser(
	ctx: {
		runMutation: RunMutationFn;
		runQuery: RunQueryFn;
	},
	args: {
		email: string;
		name: string;
	},
) {
	const email = args.email.trim().toLowerCase();
	const name = args.name.trim();
	const existingUser = await findAuthUserByEmail(ctx, email);
	if (existingUser) {
		return existingUser;
	}

	const timestamp = Date.now();
	return (await ctx.runMutation(components.betterAuth.adapter.create, {
		input: {
			data: {
				createdAt: timestamp,
				email,
				emailVerified: true,
				image: null,
				name,
				updatedAt: timestamp,
				userId: null,
			},
			model: "user",
		},
	})) as {
		_id: string;
		email: string;
		emailVerified: boolean;
		image: string | null;
		name: string;
		updatedAt: number;
		userId: string | null;
	};
}

export async function findNamedApiKey(
	ctx: {
		runQuery: RunQueryFn;
	},
	args: {
		name: string;
		referenceId: string;
	},
) {
	return (await ctx.runQuery(components.betterAuth.adapter.findOne, {
		model: "apikey",
		where: [
			{
				field: "referenceId",
				value: args.referenceId,
			},
			{
				field: "name",
				value: args.name,
			},
		],
	})) as {
		_id: string;
		enabled: boolean | null;
		name: string | null;
		referenceId: string;
	} | null;
}

export async function ensureNamedApiKey(
	ctx: {
		runMutation: RunMutationFn;
		runQuery: RunQueryFn;
	},
	args: {
		name: string;
		userId: string;
	},
) {
	const existingKey = await findNamedApiKey(ctx, {
		name: args.name,
		referenceId: args.userId,
	});
	if (existingKey) {
		if (existingKey.enabled === false) {
			await ctx.runMutation(components.betterAuth.adapter.updateOne, {
				input: {
					model: "apikey",
					update: {
						enabled: true,
						updatedAt: Date.now(),
					},
					where: [
						{
							field: "_id",
							value: existingKey._id,
						},
					],
				},
			});
		}

		return {
			apiKey: null,
			apiKeyId: existingKey._id,
			name: existingKey.name ?? args.name,
		};
	}

	const auth = createAuth(ctx as GenericCtx<DataModel>);
	const created = await auth.api.createApiKey({
		body: {
			name: args.name,
			userId: args.userId,
		},
	});

	return {
		apiKey: created.key,
		apiKeyId: created.id,
		name: created.name ?? args.name,
	};
}
