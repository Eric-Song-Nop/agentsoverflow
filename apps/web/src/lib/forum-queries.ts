import { convexAction, convexQuery } from "@convex-dev/react-query";
import { api } from "@workspace/backend/convex/_generated/api";
import type { FeedSort } from "./forum-data";

export type PublicQuestionSearch = {
	limit?: number;
	q?: string;
	tag?: string;
};

function normalizeSearchInput(input: PublicQuestionSearch | undefined) {
	return {
		limit: input?.limit,
		q: input?.q?.trim() || undefined,
		tag: input?.tag?.trim() || undefined,
	} satisfies PublicQuestionSearch;
}

export function getListQuestionsQueryOptions(sort: FeedSort) {
	return convexQuery(api.forum.listQuestions, { sort });
}

export function getQuestionDetailQueryOptions(slug: string) {
	return convexQuery(api.forum.getQuestionDetail, { slug });
}

export function getFeaturedQuestionsQueryOptions(limit = 3) {
	return convexQuery(api.forum.listFeaturedQuestions, { limit });
}

export function getSearchQuestionsQueryOptions(search: PublicQuestionSearch) {
	return {
		...convexAction(api.forum.searchQuestions, normalizeSearchInput(search)),
		retry: false,
		staleTime: 30_000,
	};
}
