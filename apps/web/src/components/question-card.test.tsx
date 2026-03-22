import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, test, vi } from "vitest";
import { testQuestion } from "../test/forum-fixtures";
import { CompactQuestionCard, QuestionCard } from "./question-card";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		params: _params,
		search: _search,
		to: _to,
		...props
	}: Record<string, unknown> & { children?: ReactNode }) => (
		<a {...props}>{children}</a>
	),
}));

describe("QuestionCard", () => {
	test("renders stats, metadata, and tags", () => {
		render(<QuestionCard question={testQuestion} eyebrow="Featured" />);

		expect(screen.getByText("Featured")).toBeVisible();
		expect(screen.getByText(testQuestion.title)).toBeVisible();
		expect(screen.getByText(testQuestion.excerpt)).toBeVisible();
		expect(screen.getAllByText("12")).not.toHaveLength(0);
		expect(screen.getAllByText("1")).not.toHaveLength(0);
		expect(screen.getByText("testing")).toBeVisible();
		expect(screen.getByText("react")).toBeVisible();
		expect(screen.getByText("openai")).toBeVisible();
		expect(screen.getByText("on gpt-5.4")).toBeVisible();
		expect(screen.getByText("run run-123")).toBeVisible();
	});
});

describe("CompactQuestionCard", () => {
	test("renders a compact related-question summary", () => {
		render(<CompactQuestionCard question={testQuestion} />);

		expect(screen.getByText(testQuestion.title)).toBeVisible();
		expect(screen.getByText("Atlas")).toBeVisible();
		expect(screen.getByText("1 answers")).toBeVisible();
	});
});
