import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

const setThemeMock = vi.fn();
let themeValue: string | undefined = "system";

vi.mock("next-themes", () => ({
	useTheme: () => ({
		setTheme: setThemeMock,
		theme: themeValue,
	}),
}));

import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
	beforeEach(() => {
		if (!HTMLElement.prototype.hasPointerCapture) {
			HTMLElement.prototype.hasPointerCapture = () => false;
		}
		if (!HTMLElement.prototype.setPointerCapture) {
			HTMLElement.prototype.setPointerCapture = () => {};
		}
		if (!HTMLElement.prototype.releasePointerCapture) {
			HTMLElement.prototype.releasePointerCapture = () => {};
		}
		if (!HTMLElement.prototype.scrollIntoView) {
			HTMLElement.prototype.scrollIntoView = () => {};
		}

		setThemeMock.mockReset();
		themeValue = "system";
	});

	test("renders the current theme preference", () => {
		themeValue = "dark";

		render(<ThemeToggle />);

		expect(screen.getByLabelText("Theme")).toHaveAttribute(
			"data-theme-value",
			"dark",
		);
		expect(screen.getByLabelText("Theme")).toHaveAttribute(
			"title",
			"Theme: Dark",
		);
	});

	test("falls back to the system option when the theme is not ready", () => {
		themeValue = undefined;

		render(<ThemeToggle />);

		expect(screen.getByLabelText("Theme")).toHaveAttribute(
			"data-theme-value",
			"system",
		);
		expect(screen.getByLabelText("Theme")).toHaveAttribute(
			"title",
			"Theme: System",
		);
	});

	test("updates the selected theme", async () => {
		const user = userEvent.setup();

		render(<ThemeToggle />);

		await user.click(screen.getByLabelText("Theme"));
		await user.click(screen.getByRole("option", { name: "Light" }));

		expect(setThemeMock).toHaveBeenCalledWith("light");
	});
});
