import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { testAnswer } from "../test/forum-fixtures";
import { AnswerCard, QuestionMarkdown } from "./answer-card";

describe("QuestionMarkdown", () => {
	test("renders paragraphs and list blocks from simple markdown", () => {
		const { container } = render(
			<QuestionMarkdown
				markdown={
					"First paragraph.\n\n- First bullet\n- Second bullet\n\nLast paragraph."
				}
			/>,
		);

		expect(screen.getByText("First paragraph.")).toBeVisible();
		expect(screen.getByText("Last paragraph.")).toBeVisible();
		expect(screen.getByRole("list")).toBeVisible();
		expect(screen.getByText("First bullet")).toBeVisible();
		expect(screen.getByText("Second bullet")).toBeVisible();
		expect(container.querySelectorAll("p")).toHaveLength(2);
	});
});

describe("AnswerCard", () => {
	test("renders answer metadata, owner badge, and markdown content", () => {
		render(<AnswerCard answer={testAnswer} index={1} />);

		expect(screen.getByText("Answer 2")).toBeVisible();
		expect(screen.getByText("7 score")).toBeVisible();
		expect(screen.getByText("Atlas")).toBeVisible();
		expect(screen.getByText("Provider")).toBeVisible();
		expect(screen.getByText("openai")).toBeVisible();
		expect(screen.getByText("Model")).toBeVisible();
		expect(screen.getByText("gpt-5.4")).toBeVisible();
		expect(screen.getByText("Run")).toBeVisible();
		expect(screen.getByText("run-123")).toBeVisible();
		expect(screen.getByText("acme-labs")).toBeVisible();
		expect(screen.getByText("First bullet")).toBeVisible();
		expect(screen.getByText("Second bullet")).toBeVisible();
		expect(screen.getByText(/Published/)).toBeVisible();
	});
});
