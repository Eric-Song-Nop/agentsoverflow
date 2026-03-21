import { describe, expect, test } from "vitest";
import { parseSearchQuery } from "../convex/searchQuery";

describe("search query parser", () => {
	test("parses v1 operators into hard constraints", () => {
		const parsed = parseSearchQuery(
			'tag:convex author:"Fixture Author" title:router body:"fetch failure" has:answers score:>=3 answers:2',
		);

		expect(parsed.semanticText).toBe("");
		expect(parsed.filters.tags).toEqual(["convex"]);
		expect(parsed.filters.authors).toEqual(["fixture author"]);
		expect(parsed.filters.titles).toEqual(["router"]);
		expect(parsed.filters.bodies).toEqual(["fetch failure"]);
		expect(parsed.filters.hasAnswers).toBe(true);
		expect(parsed.filters.minimumScore).toEqual({
			comparator: ">=",
			value: 3,
		});
		expect(parsed.filters.minimumAnswers).toEqual({
			comparator: ">=",
			value: 2,
		});
		expect(parsed.malformed).toEqual([]);
	});

	test("parses mixed free text plus operators", () => {
		const parsed = parseSearchQuery(
			'agent memory tag:convex "shared cache" -legacy',
		);

		expect(parsed.semanticText).toBe("agent memory shared cache");
		expect(parsed.textConstraints.exactPhrases).toEqual(["shared cache"]);
		expect(parsed.textConstraints.excludedTerms).toEqual(["legacy"]);
		expect(parsed.filters.tags).toEqual(["convex"]);
	});

	test("preserves quoted phrase behavior", () => {
		const parsed = parseSearchQuery('"durable execution graph"');

		expect(parsed.semanticText).toBe("durable execution graph");
		expect(parsed.textConstraints.exactPhrases).toEqual([
			"durable execution graph",
		]);
	});

	test("extracts excluded terms deterministically", () => {
		const parsed = parseSearchQuery('-bun -"legacy runtime"');

		expect(parsed.semanticText).toBe("");
		expect(parsed.textConstraints.excludedTerms).toEqual([
			"bun",
			"legacy runtime",
		]);
	});

	test("records malformed operators without promoting them to constraints", () => {
		const parsed = parseSearchQuery("tag: score:nope has:maybe answers:abc");

		expect(parsed.filters.tags).toEqual([]);
		expect(parsed.filters.hasAnswers).toBe(false);
		expect(parsed.filters.minimumScore).toBeNull();
		expect(parsed.filters.minimumAnswers).toBeNull();
		expect(parsed.malformed).toEqual([
			{ operator: "tag", rawValue: "", reason: "missing_value" },
			{ operator: "score", rawValue: "nope", reason: "invalid_number" },
			{ operator: "has", rawValue: "maybe", reason: "unsupported_value" },
			{ operator: "answers", rawValue: "abc", reason: "invalid_number" },
		]);
	});
});
