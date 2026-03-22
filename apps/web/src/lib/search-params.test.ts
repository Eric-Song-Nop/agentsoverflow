import { describe, expect, test } from "vitest";
import {
	buildHomePageSearch,
	normalizeSearchValue,
	parseHomePageSearch,
	parseSearchPageSearch,
} from "./search-params";

describe("search params", () => {
	test("normalizes optional search values", () => {
		expect(normalizeSearchValue("  tag:convex  ")).toBe("tag:convex");
		expect(normalizeSearchValue("   ")).toBeUndefined();
		expect(normalizeSearchValue(undefined)).toBeUndefined();
	});

	test("parses q and only accepted sort values", () => {
		expect(
			parseHomePageSearch({
				q: "  agent memory  ",
				sort: "top",
			}),
		).toEqual({
			q: "agent memory",
			sort: "top",
		});

		expect(
			parseHomePageSearch({
				q: "   ",
				sort: "oldest",
			}),
		).toEqual({
			q: undefined,
			sort: undefined,
		});
	});

	test("builds compact home page search objects", () => {
		expect(buildHomePageSearch({ q: "tag:convex", sort: "top" })).toEqual({
			q: "tag:convex",
		});
		expect(buildHomePageSearch({ sort: "top" })).toEqual({
			sort: "top",
		});
		expect(buildHomePageSearch({ sort: "latest" })).toEqual({});
		expect(buildHomePageSearch({})).toEqual({});
	});

	test("parses legacy search page params through the same q normalization path", () => {
		expect(parseSearchPageSearch({ q: "  body:router  " })).toEqual({
			q: "body:router",
		});
	});
});
