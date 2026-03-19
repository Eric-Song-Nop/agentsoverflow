import { hashPassword } from "better-auth/crypto";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { type MutationCtx, mutation } from "./_generated/server";
import {
	buildE2ETestPassword,
	E2E_DETAIL_ANSWER,
	E2E_DETAIL_QUESTION,
	E2E_FIXTURE_AUTHOR,
	E2E_FIXTURE_CURATOR,
	E2E_FIXTURE_REVIEWER,
	E2E_HOME_QUESTION,
	E2E_SEARCH_OTHER_QUESTION,
	E2E_SEARCH_TAGGED_QUESTION,
	E2E_TEST_DASHBOARD_KEY_NAME,
	E2E_TEST_LOGIN_EMAIL,
	E2E_TEST_LOGIN_NAME,
	getBootstrapFixturesResponse,
	isE2ETestModeEnabled,
	isValidE2ETestSecret,
} from "./e2eFixtures";
import { ensureAuthUser, ensureNamedApiKey } from "./testIdentity";

function throwAppError(code: string, message: string): never {
	throw new Error(`${code}:${message}`);
}

function assertE2ETestAccess(secret: string) {
	if (!isE2ETestModeEnabled()) {
		throwAppError("FORBIDDEN", "E2E test helpers are disabled.");
	}

	if (!isValidE2ETestSecret(secret)) {
		throwAppError("FORBIDDEN", "Invalid E2E test secret.");
	}
}

async function ensureCredentialAccount(
	ctx: MutationCtx,
	args: {
		email: string;
		name: string;
		secret: string;
	},
) {
	const user = await ensureAuthUser(ctx, {
		email: args.email,
		name: args.name,
	});
	const account = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
		model: "account",
		where: [
			{
				field: "providerId",
				value: "credential",
			},
			{
				field: "userId",
				value: user._id,
			},
		],
	})) as {
		_id: string;
	} | null;
	const password = await hashPassword(buildE2ETestPassword(args.secret));
	const updatedAt = Date.now();

	if (!account) {
		await ctx.runMutation(components.betterAuth.adapter.create, {
			input: {
				data: {
					accountId: user._id,
					createdAt: updatedAt,
					password,
					providerId: "credential",
					updatedAt,
					userId: user._id,
				},
				model: "account",
			},
		});
	} else {
		await ctx.runMutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: "account",
				update: {
					password,
					updatedAt,
				},
				where: [
					{
						field: "_id",
						value: account._id,
					},
				],
			},
		});
	}

	return user;
}

async function getQuestionBySlug(ctx: MutationCtx, slug: string) {
	return await ctx.db
		.query("questions")
		.withIndex("by_slug", (query) => query.eq("slug", slug))
		.unique();
}

async function getAnswerBySourceRunId(
	ctx: MutationCtx,
	questionId: string,
	runId: string,
) {
	const answers = await ctx.db
		.query("answers")
		.withIndex("by_question", (query) =>
			query.eq("questionId", questionId as never),
		)
		.collect();

	return answers.find((answer) => answer.runMetadata.runId === runId) ?? null;
}

export const bootstrapFixtures = mutation({
	args: {
		secret: v.string(),
	},
	handler: async (ctx, args) => {
		assertE2ETestAccess(args.secret);

		const loginUser = await ensureCredentialAccount(ctx, {
			email: E2E_TEST_LOGIN_EMAIL,
			name: E2E_TEST_LOGIN_NAME,
			secret: args.secret,
		});
		await ensureNamedApiKey(ctx, {
			name: E2E_TEST_DASHBOARD_KEY_NAME,
			userId: loginUser._id,
		});

		const fixtureAuthor = await ensureAuthUser(ctx, {
			email: E2E_FIXTURE_AUTHOR.email,
			name: E2E_FIXTURE_AUTHOR.name,
		});
		const fixtureAuthorKey = await ensureNamedApiKey(ctx, {
			name: "e2e-author-key",
			userId: fixtureAuthor._id,
		});
		const fixtureReviewer = await ensureAuthUser(ctx, {
			email: E2E_FIXTURE_REVIEWER.email,
			name: E2E_FIXTURE_REVIEWER.name,
		});
		const fixtureReviewerKey = await ensureNamedApiKey(ctx, {
			name: "e2e-reviewer-key",
			userId: fixtureReviewer._id,
		});
		const fixtureCurator = await ensureAuthUser(ctx, {
			email: E2E_FIXTURE_CURATOR.email,
			name: E2E_FIXTURE_CURATOR.name,
		});
		const fixtureCuratorKey = await ensureNamedApiKey(ctx, {
			name: E2E_FIXTURE_CURATOR.keyName,
			userId: fixtureCurator._id,
		});

		const homepageQuestion = await getQuestionBySlug(
			ctx,
			E2E_HOME_QUESTION.slug,
		);
		const searchTaggedQuestion = await getQuestionBySlug(
			ctx,
			E2E_SEARCH_TAGGED_QUESTION.slug,
		);
		const searchOtherQuestion = await getQuestionBySlug(
			ctx,
			E2E_SEARCH_OTHER_QUESTION.slug,
		);
		const detailQuestion = await getQuestionBySlug(
			ctx,
			E2E_DETAIL_QUESTION.slug,
		);

		const questions = [
			homepageQuestion
				? null
				: {
						author: {
							apiKeyId: fixtureAuthorKey.apiKeyId,
							description: E2E_FIXTURE_AUTHOR.description,
							name: E2E_FIXTURE_AUTHOR.name,
							owner: E2E_FIXTURE_AUTHOR.owner,
							slug: E2E_FIXTURE_AUTHOR.slug,
						},
						bodyMarkdown: E2E_HOME_QUESTION.bodyMarkdown,
						createdAt: E2E_HOME_QUESTION.createdAt,
						runMetadata: E2E_HOME_QUESTION.runMetadata,
						slug: E2E_HOME_QUESTION.slug,
						sourceId: E2E_HOME_QUESTION.sourceId,
						tagSlugs: [...E2E_HOME_QUESTION.tagSlugs],
						title: E2E_HOME_QUESTION.title,
						updatedAt: E2E_HOME_QUESTION.createdAt,
					},
			searchTaggedQuestion
				? null
				: {
						author: {
							apiKeyId: fixtureAuthorKey.apiKeyId,
							description: E2E_FIXTURE_AUTHOR.description,
							name: E2E_FIXTURE_AUTHOR.name,
							owner: E2E_FIXTURE_AUTHOR.owner,
							slug: E2E_FIXTURE_AUTHOR.slug,
						},
						bodyMarkdown: `${E2E_SEARCH_TAGGED_QUESTION.bodyMarkdown}\n\n${getBootstrapFixturesResponse().fixtures.searchQuery}`,
						createdAt: E2E_SEARCH_TAGGED_QUESTION.createdAt,
						runMetadata: E2E_SEARCH_TAGGED_QUESTION.runMetadata,
						slug: E2E_SEARCH_TAGGED_QUESTION.slug,
						sourceId: E2E_SEARCH_TAGGED_QUESTION.sourceId,
						tagSlugs: [...E2E_SEARCH_TAGGED_QUESTION.tagSlugs],
						title: E2E_SEARCH_TAGGED_QUESTION.title,
						updatedAt: E2E_SEARCH_TAGGED_QUESTION.createdAt,
					},
			searchOtherQuestion
				? null
				: {
						author: {
							apiKeyId: fixtureReviewerKey.apiKeyId,
							description: E2E_FIXTURE_REVIEWER.description,
							name: E2E_FIXTURE_REVIEWER.name,
							owner: E2E_FIXTURE_REVIEWER.owner,
							slug: E2E_FIXTURE_REVIEWER.slug,
						},
						bodyMarkdown: `${E2E_SEARCH_OTHER_QUESTION.bodyMarkdown}\n\n${getBootstrapFixturesResponse().fixtures.searchQuery}`,
						createdAt: E2E_SEARCH_OTHER_QUESTION.createdAt,
						runMetadata: E2E_SEARCH_OTHER_QUESTION.runMetadata,
						slug: E2E_SEARCH_OTHER_QUESTION.slug,
						sourceId: E2E_SEARCH_OTHER_QUESTION.sourceId,
						tagSlugs: [...E2E_SEARCH_OTHER_QUESTION.tagSlugs],
						title: E2E_SEARCH_OTHER_QUESTION.title,
						updatedAt: E2E_SEARCH_OTHER_QUESTION.createdAt,
					},
			detailQuestion
				? null
				: {
						author: {
							apiKeyId: fixtureAuthorKey.apiKeyId,
							description: E2E_FIXTURE_AUTHOR.description,
							name: E2E_FIXTURE_AUTHOR.name,
							owner: E2E_FIXTURE_AUTHOR.owner,
							slug: E2E_FIXTURE_AUTHOR.slug,
						},
						bodyMarkdown: E2E_DETAIL_QUESTION.bodyMarkdown,
						createdAt: E2E_DETAIL_QUESTION.createdAt,
						runMetadata: E2E_DETAIL_QUESTION.runMetadata,
						slug: E2E_DETAIL_QUESTION.slug,
						sourceId: E2E_DETAIL_QUESTION.sourceId,
						tagSlugs: [...E2E_DETAIL_QUESTION.tagSlugs],
						title: E2E_DETAIL_QUESTION.title,
						updatedAt: E2E_DETAIL_QUESTION.createdAt,
					},
		].filter((question) => question !== null);

		if (questions.length > 0) {
			await ctx.runMutation(internal.forum.importForumSnapshot, {
				answers: [],
				questions,
				votes: [],
			});
		}

		const stableHomepageQuestion = await getQuestionBySlug(
			ctx,
			E2E_HOME_QUESTION.slug,
		);
		const stableSearchTaggedQuestion = await getQuestionBySlug(
			ctx,
			E2E_SEARCH_TAGGED_QUESTION.slug,
		);
		const stableSearchOtherQuestion = await getQuestionBySlug(
			ctx,
			E2E_SEARCH_OTHER_QUESTION.slug,
		);
		const stableDetailQuestion = await getQuestionBySlug(
			ctx,
			E2E_DETAIL_QUESTION.slug,
		);
		if (
			!stableHomepageQuestion ||
			!stableSearchTaggedQuestion ||
			!stableSearchOtherQuestion ||
			!stableDetailQuestion
		) {
			throwAppError(
				"INTERNAL_SERVER_ERROR",
				"Failed to resolve seeded questions.",
			);
		}

		const detailAnswer = await getAnswerBySourceRunId(
			ctx,
			stableDetailQuestion._id,
			E2E_DETAIL_ANSWER.runMetadata.runId,
		);
		const answers = detailAnswer
			? []
			: [
					{
						author: {
							apiKeyId: fixtureReviewerKey.apiKeyId,
							description: E2E_FIXTURE_REVIEWER.description,
							name: E2E_FIXTURE_REVIEWER.name,
							owner: E2E_FIXTURE_REVIEWER.owner,
							slug: E2E_FIXTURE_REVIEWER.slug,
						},
						bodyMarkdown: E2E_DETAIL_ANSWER.bodyMarkdown,
						createdAt: E2E_DETAIL_ANSWER.createdAt,
						questionId: stableDetailQuestion._id,
						runMetadata: E2E_DETAIL_ANSWER.runMetadata,
						sourceId: E2E_DETAIL_ANSWER.sourceId,
						updatedAt: E2E_DETAIL_ANSWER.createdAt,
					},
				];

		await ctx.runMutation(internal.forum.importForumSnapshot, {
			answers,
			questions: [],
			votes: [
				{
					targetId: stableHomepageQuestion._id,
					targetType: "question",
					value: 1,
					voterApiKeyId: fixtureCuratorKey.apiKeyId,
				},
				{
					targetId: stableDetailQuestion._id,
					targetType: "question",
					value: 1,
					voterApiKeyId: fixtureCuratorKey.apiKeyId,
				},
			],
		});

		const stableDetailAnswer = await getAnswerBySourceRunId(
			ctx,
			stableDetailQuestion._id,
			E2E_DETAIL_ANSWER.runMetadata.runId,
		);
		if (!stableDetailAnswer) {
			throwAppError(
				"INTERNAL_SERVER_ERROR",
				"Failed to resolve the seeded detail answer.",
			);
		}

		await ctx.runMutation(internal.forum.importForumSnapshot, {
			answers: [],
			questions: [],
			votes: [
				{
					targetId: stableDetailAnswer._id,
					targetType: "answer",
					value: 1,
					voterApiKeyId: fixtureCuratorKey.apiKeyId,
				},
			],
		});

		return getBootstrapFixturesResponse();
	},
});
