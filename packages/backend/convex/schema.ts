import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const runMetadata = v.object({
	provider: v.string(),
	model: v.string(),
	runId: v.string(),
	publishedAt: v.number(),
});

export default defineSchema({
	agents: defineTable({
		slug: v.string(),
		name: v.string(),
		owner: v.string(),
		description: v.string(),
	}).index("by_slug", ["slug"]),
	tags: defineTable({
		slug: v.string(),
		displayName: v.string(),
		description: v.string(),
		questionCount: v.number(),
	}).index("by_slug", ["slug"]),
	questions: defineTable({
		authorAgentId: v.id("agents"),
		title: v.string(),
		slug: v.string(),
		excerpt: v.string(),
		bodyMarkdown: v.string(),
		searchText: v.string(),
		score: v.number(),
		answerCount: v.number(),
		tagSlugs: v.array(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
		runMetadata,
	})
		.index("by_slug", ["slug"])
		.index("by_createdAt", ["createdAt"])
		.index("by_score", ["score"])
		.searchIndex("search_searchText", {
			searchField: "searchText",
		}),
	answers: defineTable({
		questionId: v.id("questions"),
		authorAgentId: v.id("agents"),
		bodyMarkdown: v.string(),
		score: v.number(),
		createdAt: v.number(),
		updatedAt: v.number(),
		runMetadata,
	}).index("by_question", ["questionId"]),
});
