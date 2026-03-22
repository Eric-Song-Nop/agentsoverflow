import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

const invalidateQueriesMock = vi.fn().mockResolvedValue(undefined);
const useMutationMock = vi.fn();
const useQueryMock = vi.fn();
const createApiKeyMock = vi.fn();
const deleteApiKeyMock = vi.fn();
const getApiKeysQueryOptionsMock = vi.fn();
const revokeApiKeyMock = vi.fn();

vi.mock("@tanstack/react-query", async () => {
	const actual = await vi.importActual<typeof import("@tanstack/react-query")>(
		"@tanstack/react-query",
	);

	return {
		...actual,
		useMutation: (options: unknown) => useMutationMock(options),
		useQuery: (options: unknown) => useQueryMock(options),
		useQueryClient: () => ({
			invalidateQueries: invalidateQueriesMock,
		}),
	};
});

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => () => ({
		useParams: () => ({}),
	}),
	redirect: vi.fn((options) => options),
}));

vi.mock("../lib/auth-api-keys", () => ({
	apiKeysQueryKey: ["auth", "apiKeys"],
	createApiKey: (...args: unknown[]) => createApiKeyMock(...args),
	deleteApiKey: (...args: unknown[]) => deleteApiKeyMock(...args),
	getApiKeysQueryOptions: () => getApiKeysQueryOptionsMock(),
	revokeApiKey: (...args: unknown[]) => revokeApiKeyMock(...args),
}));

import { DashboardPage } from "../routes/dashboard";

function createMutationStub(options: {
	mutationFn: (value: unknown) => Promise<unknown>;
	onMutate?: (value: unknown) => void;
	onSuccess?: (result: unknown, value: unknown) => Promise<void> | void;
}) {
	return {
		error: null,
		isPending: false,
		mutateAsync: async (value: unknown) => {
			options.onMutate?.(value);
			const result = await options.mutationFn(value);
			await options.onSuccess?.(result, value);
			return result;
		},
		variables: undefined,
	};
}

describe("DashboardPage", () => {
	beforeEach(() => {
		createApiKeyMock.mockReset();
		deleteApiKeyMock.mockReset();
		getApiKeysQueryOptionsMock.mockReset();
		invalidateQueriesMock.mockClear();
		revokeApiKeyMock.mockReset();
		useMutationMock.mockReset();
		useQueryMock.mockReset();

		getApiKeysQueryOptionsMock.mockReturnValue({
			queryFn: vi.fn(),
			queryKey: ["auth", "apiKeys"],
		});
		useQueryMock.mockReturnValue({
			data: [],
			error: null,
			isPending: false,
		});
		useMutationMock.mockImplementation((options) =>
			createMutationStub(
				options as {
					mutationFn: (value: unknown) => Promise<unknown>;
					onMutate?: (value: unknown) => void;
					onSuccess?: (result: unknown, value: unknown) => Promise<void> | void;
				},
			),
		);
	});

	test("renders an empty state when there are no API keys", () => {
		render(<DashboardPage />);

		expect(screen.getByRole("heading", { name: "API Keys" })).toBeVisible();
		expect(screen.getByText("No API keys yet.")).toBeVisible();
	});

	test("shows query errors from the API key list request", () => {
		useQueryMock.mockReturnValue({
			data: [],
			error: new Error("List failed."),
			isPending: false,
		});

		render(<DashboardPage />);

		expect(screen.getByText("Something went wrong")).toBeVisible();
		expect(screen.getByText("List failed.")).toBeVisible();
	});

	test("opens and cancels the create form", async () => {
		const user = userEvent.setup();

		render(<DashboardPage />);

		await user.click(screen.getByRole("button", { name: "Create API key" }));
		expect(screen.getByLabelText("Key name")).toBeVisible();

		await user.type(screen.getByLabelText("Key name"), "local-key");
		await user.click(
			screen.getAllByRole("button", { name: "Cancel" })[1] ??
				screen.getByRole("button", { name: "Cancel" }),
		);

		expect(screen.queryByLabelText("Key name")).toBeNull();
	});

	test("creates a key, reveals the secret, and invalidates the list query", async () => {
		const user = userEvent.setup();
		createApiKeyMock.mockResolvedValue({
			id: "key-2",
			key: "aso_secret_123",
			name: "local-key",
		});

		render(<DashboardPage />);

		await user.click(screen.getByRole("button", { name: "Create API key" }));
		await user.type(screen.getByLabelText("Key name"), "local-key");
		await user.click(screen.getByRole("button", { name: "Create API key" }));

		await waitFor(() => {
			expect(createApiKeyMock).toHaveBeenCalledWith("local-key");
		});
		expect(screen.getByText("Secret shown once")).toBeVisible();
		expect(screen.getByTestId("dashboard-revealed-secret")).toHaveTextContent(
			"aso_secret_123",
		);
		expect(invalidateQueriesMock).toHaveBeenCalledWith({
			queryKey: ["auth", "apiKeys"],
		});
	});

	test("surfaces a clipboard error when the browser cannot copy", async () => {
		const user = userEvent.setup();
		const originalClipboard = navigator.clipboard;

		createApiKeyMock.mockResolvedValue({
			id: "key-3",
			key: "aso_secret_456",
			name: "copy-test",
		});
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: undefined,
		});

		try {
			render(<DashboardPage />);

			await user.click(screen.getByRole("button", { name: "Create API key" }));
			await user.type(screen.getByLabelText("Key name"), "copy-test");
			await user.click(screen.getByRole("button", { name: "Create API key" }));
			await user.click(screen.getByRole("button", { name: /^Copy$/ }));

			expect(
				screen.getByText("Clipboard access is not available in this browser."),
			).toBeVisible();
		} finally {
			Object.defineProperty(navigator, "clipboard", {
				configurable: true,
				value: originalClipboard,
			});
		}
	});

	test("revoke and delete actions call their mutations and invalidate the list", async () => {
		const user = userEvent.setup();
		revokeApiKeyMock.mockResolvedValue(undefined);
		deleteApiKeyMock.mockResolvedValue(undefined);
		useQueryMock.mockReturnValue({
			data: [
				{
					createdAt: "2026-03-20T09:15:00.000Z",
					enabled: true,
					id: "key-1",
					lastRequest: null,
					name: "existing-key",
				},
			],
			error: null,
			isPending: false,
		});

		render(<DashboardPage />);

		const table = within(screen.getByTestId("dashboard-api-key-table"));
		await user.click(table.getByRole("button", { name: "Revoke" }));
		await user.click(table.getByRole("button", { name: "Delete" }));

		await waitFor(() => {
			expect(revokeApiKeyMock).toHaveBeenCalledWith("key-1");
			expect(deleteApiKeyMock).toHaveBeenCalledWith("key-1");
		});
		expect(invalidateQueriesMock).toHaveBeenCalledTimes(2);
	});
});
