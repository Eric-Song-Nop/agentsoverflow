import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const navigateMock = vi.fn();
const useSessionMock = vi.fn();
let routerSearch: Record<string, unknown> = {};

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
	useNavigate: () => navigateMock,
	useRouterState: ({
		select,
	}: {
		select: (state: {
			location: { search: Record<string, unknown> };
		}) => unknown;
	}) => select({ location: { search: routerSearch } }),
}));

vi.mock("../lib/auth-client", () => ({
	authClient: {
		useSession: () => useSessionMock(),
	},
}));

import { SiteShell } from "./site-shell";

describe("SiteShell", () => {
	beforeEach(() => {
		navigateMock.mockReset();
		routerSearch = {};
		useSessionMock.mockReset();
		useSessionMock.mockReturnValue({
			data: null,
		});
	});

	test("renders the anonymous header and seeds the search box from router state", () => {
		routerSearch = {
			q: "  tag:convex  ",
		};

		const { container } = render(
			<SiteShell>
				<div>Page content</div>
			</SiteShell>,
		);

		expect(
			screen.getByRole("textbox", { name: "Search all questions" }),
		).toHaveValue("tag:convex");
		expect(screen.getByText("Sign in")).toBeVisible();
		expect(screen.queryByText("Settings")).toBeNull();
		expect(container.querySelector(".lucide-user-round")).not.toBeNull();
	});

	test("renders the authenticated settings action", () => {
		useSessionMock.mockReturnValue({
			data: {
				session: {
					id: "session-1",
				},
			},
		});

		render(
			<SiteShell>
				<div>Page content</div>
			</SiteShell>,
		);

		expect(screen.getByText("Settings")).toBeVisible();
		expect(screen.queryByText("Sign in")).toBeNull();
	});

	test("submits a trimmed query through router navigation", async () => {
		const user = userEvent.setup();

		render(
			<SiteShell>
				<div>Page content</div>
			</SiteShell>,
		);

		const searchBox = screen.getByRole("textbox", {
			name: "Search all questions",
		});
		await user.type(searchBox, "  agents  ");
		await user.click(screen.getByRole("button", { name: "Submit search" }));

		expect(navigateMock).toHaveBeenCalledWith({
			search: {
				q: "agents",
			},
			to: "/",
		});
	});

	test("submitting only whitespace clears the active query", async () => {
		const user = userEvent.setup();
		routerSearch = {
			q: "body:router",
		};

		render(
			<SiteShell>
				<div>Page content</div>
			</SiteShell>,
		);

		const searchBox = screen.getByRole("textbox", {
			name: "Search all questions",
		});
		await user.clear(searchBox);
		await user.type(searchBox, "   ");
		await user.click(screen.getByRole("button", { name: "Submit search" }));

		expect(navigateMock).toHaveBeenCalledWith({
			search: {},
			to: "/",
		});
	});

	test("search submit button uses stable visual feedback instead of shifting downward", () => {
		render(
			<SiteShell>
				<div>Page content</div>
			</SiteShell>,
		);

		expect(screen.getByRole("button", { name: "Submit search" })).toHaveClass(
			"active:translate-y-0",
		);
	});
});
