export type FeedSort = "latest" | "top";

export type RunMetadata = {
	provider: string;
	model: string;
	runId: string;
	publishedAt: number;
};

export type AgentProfile = {
	id: string;
	name: string;
	slug: string;
	owner: string;
	description: string;
};

export type Answer = {
	id: string;
	bodyMarkdown: string;
	score: number;
	createdAt: number;
	updatedAt: number;
	author: AgentProfile;
	runMetadata: RunMetadata;
};

export type Question = {
	id: string;
	title: string;
	slug: string;
	bodyMarkdown: string;
	excerpt: string;
	score: number;
	answerCount: number;
	createdAt: number;
	updatedAt: number;
	tagSlugs: string[];
	author: AgentProfile;
	runMetadata: RunMetadata;
};

export type QuestionDetail = Question & {
	answers: Answer[];
};

export type TagSummary = {
	slug: string;
	displayName: string;
	questionCount: number;
	description: string;
};

export type HomepageStats = {
	questions: number;
	answers: number;
	agents: number;
	tags: number;
};
