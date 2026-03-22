import { beforeEach, describe, expect, test, vi } from "vitest";

const { convexActionMock, convexQueryMock } = vi.hoisted(() => ({
	convexActionMock: vi.fn(),
	convexQueryMock: vi.fn(),
}));

vi.mock("@convex-dev/react-query", () => ({
	convexAction: convexActionMock,
	convexQuery: convexQueryMock,
}));

vi.mock("@workspace/backend/convex/_generated/api", () => ({
	api: {
		forum: {
			getQuestionDetail: "getQuestionDetail",
			listFeaturedQuestions: "listFeaturedQuestions",
			listQuestions: "listQuestions",
			searchQuestions: "searchQuestions",
		},
	},
}));

import {
	getFeaturedQuestionsQueryOptions,
	getListQuestionsQueryOptions,
	getQuestionDetailQueryOptions,
	getSearchQuestionsQueryOptions,
} from "./forum-queries";

describe("forum query options", () => {
	beforeEach(() => {
		convexActionMock.mockReset();
		convexQueryMock.mockReset();
		convexActionMock.mockImplementation((reference, args) => ({
			args,
			queryKey: ["action", reference, args],
			reference,
		}));
		convexQueryMock.mockImplementation((reference, args) => ({
			args,
			queryKey: ["query", reference, args],
			reference,
		}));
	});

	test("creates feed and detail query options with the expected arguments", () => {
		expect(getListQuestionsQueryOptions("top")).toEqual({
			args: { sort: "top" },
			queryKey: ["query", "listQuestions", { sort: "top" }],
			reference: "listQuestions",
		});
		expect(getQuestionDetailQueryOptions("front-end-tests")).toEqual({
			args: { slug: "front-end-tests" },
			queryKey: ["query", "getQuestionDetail", { slug: "front-end-tests" }],
			reference: "getQuestionDetail",
		});
		expect(getFeaturedQuestionsQueryOptions(5)).toEqual({
			args: { limit: 5 },
			queryKey: ["query", "listFeaturedQuestions", { limit: 5 }],
			reference: "listFeaturedQuestions",
		});
	});

	test("normalizes search inputs and disables retries for search actions", () => {
		expect(
			getSearchQuestionsQueryOptions({
				limit: 12,
				q: "  body:router  ",
				tag: "  convex  ",
			}),
		).toEqual({
			args: {
				limit: 12,
				q: "body:router",
				tag: "convex",
			},
			queryKey: [
				"action",
				"searchQuestions",
				{
					limit: 12,
					q: "body:router",
					tag: "convex",
				},
			],
			reference: "searchQuestions",
			retry: false,
			staleTime: 30_000,
		});
	});

	test("drops blank search fields instead of sending empty strings", () => {
		expect(
			getSearchQuestionsQueryOptions({
				q: "   ",
				tag: "",
			}),
		).toEqual({
			args: {
				limit: undefined,
				q: undefined,
				tag: undefined,
			},
			queryKey: [
				"action",
				"searchQuestions",
				{
					limit: undefined,
					q: undefined,
					tag: undefined,
				},
			],
			reference: "searchQuestions",
			retry: false,
			staleTime: 30_000,
		});
	});
});
