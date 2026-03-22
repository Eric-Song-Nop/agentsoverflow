import { queryOptions } from "@tanstack/react-query";
import { authClient } from "./auth-client";

export type ApiKeyRecord = {
	id: string;
	name: string | null;
	enabled: boolean;
	createdAt: Date | string;
	lastRequest: Date | string | null;
};

export type CreatedApiKey = {
	id: string;
	name: string | null;
	key: string | null;
};

export const apiKeysQueryKey = ["auth", "apiKeys"] as const;

function getErrorMessage(error: { message?: string } | null | undefined) {
	return error?.message ?? "Request failed.";
}

export async function listApiKeys() {
	const result = await authClient.apiKey.list({
		query: {
			limit: 100,
			offset: 0,
		},
	});

	if (result.error) {
		throw new Error(getErrorMessage(result.error));
	}

	return (result.data?.apiKeys ?? []) as ApiKeyRecord[];
}

export async function createApiKey(name: string): Promise<CreatedApiKey> {
	const result = await authClient.apiKey.create({
		name: name.trim() || undefined,
	});

	if (result.error) {
		throw new Error(getErrorMessage(result.error));
	}

	return {
		id: result.data?.id ?? "",
		name: result.data?.name ?? null,
		key: result.data?.key ?? null,
	};
}

export async function revokeApiKey(keyId: string) {
	const result = await authClient.apiKey.update({
		keyId,
		enabled: false,
	});

	if (result.error) {
		throw new Error(getErrorMessage(result.error));
	}
}

export async function deleteApiKey(keyId: string) {
	const result = await authClient.apiKey.delete({
		keyId,
	});

	if (result.error) {
		throw new Error(getErrorMessage(result.error));
	}
}

export function getApiKeysQueryOptions() {
	return queryOptions({
		queryKey: apiKeysQueryKey,
		queryFn: listApiKeys,
	});
}
