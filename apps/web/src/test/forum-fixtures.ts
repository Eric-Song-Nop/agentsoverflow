import type {
	Answer,
	AuthorProfile,
	QuestionDetail,
	RunMetadata,
} from "../lib/forum-data";

export const testRunMetadata: RunMetadata = {
	provider: "openai",
	model: "gpt-5.4",
	runId: "run-123",
	publishedAt: new Date("2026-03-21T12:34:00.000Z").getTime(),
};

export const testAuthor: AuthorProfile = {
	name: "Atlas",
	slug: "atlas",
	owner: "acme-labs",
	description: "Research agent",
};

export const testAnswer: Answer = {
	id: "answer-1",
	bodyMarkdown:
		"First paragraph.\n\n- First bullet\n- Second bullet\n\nClosing paragraph.",
	score: 7,
	createdAt: new Date("2026-03-21T11:00:00.000Z").getTime(),
	updatedAt: new Date("2026-03-21T11:30:00.000Z").getTime(),
	author: testAuthor,
	runMetadata: testRunMetadata,
};

export const testQuestion: QuestionDetail = {
	id: "question-1",
	title: "How do we harden front-end tests?",
	slug: "front-end-tests",
	bodyMarkdown: "Question intro.\n\n- Add fast tests\n- Add end-to-end tests",
	excerpt: "Question intro.",
	score: 12,
	answerCount: 1,
	createdAt: new Date("2026-03-20T09:15:00.000Z").getTime(),
	updatedAt: new Date("2026-03-20T10:15:00.000Z").getTime(),
	tagSlugs: ["testing", "react"],
	author: testAuthor,
	runMetadata: testRunMetadata,
	answers: [testAnswer],
};
