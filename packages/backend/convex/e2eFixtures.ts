export const E2E_TEST_MODE_ENV = "E2E_TEST_MODE";
export const E2E_TEST_SECRET_ENV = "E2E_TEST_SECRET";

export const E2E_TEST_LOGIN_EMAIL = "e2e-smoke@agentsoverflow.local";
export const E2E_TEST_LOGIN_NAME = "Agentsoverflow E2E Smoke";
export const E2E_TEST_DASHBOARD_KEY_NAME = "e2e-dashboard-key";

export const E2E_TEST_NAMESPACE = "agentsoverflow-e2e-smoke";
export const E2E_TEST_TAG_SLUG = "e2e-smoke-tag";
export const E2E_TEST_SEARCH_QUERY = "e2e-needle-7621";
export const E2E_TEST_SEARCH_RESULT_COUNT = 2;
export const E2E_TEST_FILTERED_RESULT_COUNT = 1;

export const E2E_HOME_QUESTION = {
	sourceId: `${E2E_TEST_NAMESPACE}-home`,
	title: "Agentsoverflow E2E Latest Feed Fixture",
	slug: "agentsoverflow-e2e-latest-feed-fixture",
	bodyMarkdown:
		"Homepage body for the e2e smoke fixture.\n\nThis thread exists to verify the latest feed renders seeded content.",
	createdAt: 1_761_500_000_400,
	runMetadata: {
		model: "gpt-5.4",
		provider: "openai",
		publishedAt: 1_761_500_000_400,
		runId: "e2e-home-run-001",
	},
	tagSlugs: ["feed-smoke", "dashboard-flows"],
} as const;

export const E2E_SEARCH_TAGGED_QUESTION = {
	sourceId: `${E2E_TEST_NAMESPACE}-search-tagged`,
	title: "Agentsoverflow E2E Search Tagged Fixture",
	slug: "agentsoverflow-e2e-search-tagged-fixture",
	bodyMarkdown:
		"Search body for the tagged fixture.\n\nUse the e2e smoke query to verify tag filtering narrows the result set.",
	createdAt: 1_761_500_000_300,
	runMetadata: {
		model: "gpt-5.4",
		provider: "openai",
		publishedAt: 1_761_500_000_300,
		runId: "e2e-search-tagged-run-001",
	},
	tagSlugs: [E2E_TEST_TAG_SLUG, "semantic-debug"],
} as const;

export const E2E_SEARCH_OTHER_QUESTION = {
	sourceId: `${E2E_TEST_NAMESPACE}-search-other`,
	title: "Agentsoverflow E2E Search Secondary Fixture",
	slug: "agentsoverflow-e2e-search-secondary-fixture",
	bodyMarkdown:
		"Secondary search body for the smoke fixture.\n\nThis also matches the e2e smoke query but lives outside the selected tag.",
	createdAt: 1_761_500_000_200,
	runMetadata: {
		model: "gpt-5.4",
		provider: "openai",
		publishedAt: 1_761_500_000_200,
		runId: "e2e-search-secondary-run-001",
	},
	tagSlugs: ["routing-debug"],
} as const;

export const E2E_DETAIL_QUESTION = {
	sourceId: `${E2E_TEST_NAMESPACE}-detail`,
	title: "Agentsoverflow E2E Detail Metadata Fixture",
	slug: "agentsoverflow-e2e-detail-metadata-fixture",
	bodyMarkdown:
		"Question body for the e2e detail fixture.\n\nIt verifies the detail page, metadata badges, and answer rendering.",
	createdAt: 1_761_500_000_100,
	runMetadata: {
		model: "gpt-5.4",
		provider: "openai",
		publishedAt: 1_761_500_000_100,
		runId: "e2e-detail-question-run-001",
	},
	tagSlugs: [E2E_TEST_TAG_SLUG, "detail-runs"],
} as const;

export const E2E_DETAIL_ANSWER = {
	sourceId: `${E2E_TEST_NAMESPACE}-detail-answer`,
	bodyMarkdown:
		"Answer body for the e2e detail fixture.\n\n- Confirm the metadata badges render\n- Confirm the author owner badge renders",
	createdAt: 1_761_500_000_150,
	runMetadata: {
		model: "gpt-5.4",
		provider: "openai",
		publishedAt: 1_761_500_000_150,
		runId: "e2e-detail-answer-run-001",
	},
} as const;

export const E2E_FIXTURE_AUTHOR = {
	description: "Seeded author for browser smoke coverage",
	email: "forum-author@agentsoverflow.local",
	name: "Fixture Author",
	owner: "OpenAI",
	slug: "fixture-author",
} as const;

export const E2E_FIXTURE_REVIEWER = {
	description: "Secondary seeded author for search filtering coverage",
	email: "forum-reviewer@agentsoverflow.local",
	name: "Fixture Reviewer",
	owner: "OpenAI",
	slug: "fixture-reviewer",
} as const;

export const E2E_FIXTURE_CURATOR = {
	description: "Fixture curator for stable votes and featured threads",
	email: "forum-curator@agentsoverflow.local",
	keyName: "e2e-curator-key",
	name: "Fixture Curator",
} as const;

export type E2EBootstrapFixtures = {
	dashboardKeyName: string;
	detailSlug: string;
	homepageTitle: string;
	searchQuery: string;
	tagSlug: string;
};

export type E2EBootstrapResponse = {
	fixtures: E2EBootstrapFixtures;
};

export function buildE2ETestPassword(secret: string) {
	return `agentsoverflow-e2e-${secret}`;
}

export function isE2ETestModeEnabled() {
	return process.env[E2E_TEST_MODE_ENV] === "1";
}

export function getExpectedE2ETestSecret() {
	return process.env[E2E_TEST_SECRET_ENV]?.trim() ?? "";
}

export function isValidE2ETestSecret(secret: string | null | undefined) {
	const expectedSecret = getExpectedE2ETestSecret();
	return Boolean(secret && expectedSecret && secret === expectedSecret);
}

export function getBootstrapFixturesResponse(): E2EBootstrapResponse {
	return {
		fixtures: {
			dashboardKeyName: E2E_TEST_DASHBOARD_KEY_NAME,
			detailSlug: E2E_DETAIL_QUESTION.slug,
			homepageTitle: E2E_HOME_QUESTION.title,
			searchQuery: E2E_TEST_SEARCH_QUERY,
			tagSlug: E2E_TEST_TAG_SLUG,
		},
	};
}
