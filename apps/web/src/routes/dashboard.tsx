import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@workspace/ui/components/table";
import {
	AlertTriangle,
	Copy,
	KeyRound,
	LoaderCircle,
	Trash2,
	XCircle,
} from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";
import { authClient } from "../lib/auth-client";

export const Route = createFileRoute("/dashboard")({
	beforeLoad: ({ context }) => {
		if (!context.isAuthenticated) {
			throw redirect({ to: "/login" });
		}
	},
	component: DashboardPage,
});

type ApiKeyRecord = {
	id: string;
	name: string | null;
	enabled: boolean;
	createdAt: Date;
	lastRequest: Date | null;
};

type RevealedSecret = {
	id: string;
	name: string | null;
	key: string;
};

const settingsCategories = [
	{ id: "api-keys", label: "API Keys", active: true },
] as const;

function formatDateTime(value: Date | string | null) {
	if (!value) {
		return "Never";
	}

	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(typeof value === "string" ? new Date(value) : value);
}

function DashboardPage() {
	const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
	const [keyName, setKeyName] = useState("");
	const [revealedSecret, setRevealedSecret] = useState<RevealedSecret | null>(
		null,
	);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isHydrated, setIsHydrated] = useState(false);
	const [isLoadingKeys, setIsLoadingKeys] = useState(false);
	const [isCreating, setIsCreating] = useState(false);
	const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
	const [activeKeyId, setActiveKeyId] = useState<string | null>(null);

	const loadKeys = useEffectEvent(async () => {
		setIsLoadingKeys(true);
		setErrorMessage(null);
		const result = await authClient.apiKey.list({
			query: {
				limit: 100,
				offset: 0,
			},
		});
		setIsLoadingKeys(false);

		if (result.error) {
			setErrorMessage(result.error.message ?? "Failed to load API keys.");
			return;
		}

		setApiKeys((result.data?.apiKeys ?? []) as unknown as ApiKeyRecord[]);
	});

	useEffect(() => {
		setIsHydrated(true);
		void loadKeys();
	}, []);

	const handleCreateKey = async () => {
		setIsCreating(true);
		setErrorMessage(null);
		const name = keyName.trim();
		const result = await authClient.apiKey.create({
			name: name || undefined,
		});
		setIsCreating(false);

		if (result.error) {
			setErrorMessage(result.error.message ?? "Failed to create API key.");
			return;
		}

		if (result.data?.key) {
			setRevealedSecret({
				id: result.data.id,
				name: result.data.name ?? null,
				key: result.data.key,
			});
		}

		setKeyName("");
		setIsCreateFormOpen(false);
		await loadKeys();
	};

	const handleRevokeKey = async (keyId: string) => {
		setActiveKeyId(keyId);
		setErrorMessage(null);
		const result = await authClient.apiKey.update({
			keyId,
			enabled: false,
		});
		setActiveKeyId(null);

		if (result.error) {
			setErrorMessage(result.error.message ?? "Failed to revoke API key.");
			return;
		}

		await loadKeys();
	};

	const handleDeleteKey = async (keyId: string) => {
		setActiveKeyId(keyId);
		setErrorMessage(null);
		const result = await authClient.apiKey.delete({
			keyId,
		});
		setActiveKeyId(null);

		if (result.error) {
			setErrorMessage(result.error.message ?? "Failed to delete API key.");
			return;
		}

		if (revealedSecret?.id === keyId) {
			setRevealedSecret(null);
		}

		await loadKeys();
	};

	const handleCopy = async (value: string) => {
		if (typeof navigator === "undefined" || !navigator.clipboard) {
			setErrorMessage("Clipboard access is not available in this browser.");
			return;
		}

		await navigator.clipboard.writeText(value);
	};

	return (
		<div className="mx-auto max-w-6xl px-5 py-7 lg:px-8">
			<div className="grid gap-8 lg:grid-cols-[190px_minmax(0,1fr)]">
				<aside className="h-fit lg:sticky lg:top-24">
					<div className="space-y-3 lg:border-r lg:pr-5">
						<div className="space-y-1">
							<p className="text-sm font-medium text-foreground">Settings</p>
							<p className="text-xs text-muted-foreground">Account settings</p>
						</div>
						<nav aria-label="Settings categories">
							<ul className="space-y-1">
								{settingsCategories.map((category) => (
									<li key={category.id}>
										<button
											type="button"
											className={
												category.active
													? "w-full rounded-md bg-secondary px-2.5 py-1.5 text-left text-sm font-medium text-foreground"
													: "w-full rounded-md px-2.5 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground"
											}
										>
											{category.label}
										</button>
									</li>
								))}
							</ul>
						</nav>
					</div>
				</aside>

				<section className="min-w-0 space-y-6">
					<header className="flex flex-wrap items-start justify-between gap-4">
						<div className="space-y-1">
							<h1 className="text-xl font-semibold tracking-tight text-foreground">
								API Keys
							</h1>
							<p className="max-w-2xl text-sm text-muted-foreground">
								Manage keys used for CLI access. Secrets are shown once after
								creation.
							</p>
						</div>
						<Button
							size="sm"
							onClick={() => setIsCreateFormOpen((value) => !value)}
						>
							<KeyRound className="size-3.5" />
							{isCreateFormOpen ? "Cancel" : "Create API key"}
						</Button>
					</header>

					{revealedSecret ? (
						<Alert className="border-amber-300/70 bg-amber-50 px-3 py-3 text-amber-950 dark:border-amber-600/40 dark:bg-amber-950/20 dark:text-amber-100">
							<div className="flex items-start justify-between gap-3">
								<div className="flex min-w-0 gap-3">
									<AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
									<div className="min-w-0">
										<AlertTitle className="text-sm">
											Secret shown once
										</AlertTitle>
										<AlertDescription className="mt-1 text-xs text-amber-900/90 dark:text-amber-100/80">
											Copy this value now. It will not be available again after
											dismissal.
										</AlertDescription>
									</div>
								</div>
								<Button
									variant="outline"
									size="xs"
									onClick={() => setRevealedSecret(null)}
								>
									Dismiss
								</Button>
							</div>
							<div className="mt-3 flex flex-wrap items-center gap-2">
								<div className="min-w-[240px] flex-1 rounded-md border border-amber-300/70 bg-black/90 px-3 py-2 font-mono text-xs text-amber-100">
									{revealedSecret.key}
								</div>
								<Button
									size="xs"
									onClick={() => void handleCopy(revealedSecret.key)}
								>
									<Copy className="size-3" />
									Copy
								</Button>
								<p className="text-xs text-amber-900/80 dark:text-amber-100/70">
									{revealedSecret.name ?? "Unnamed key"}
								</p>
							</div>
						</Alert>
					) : null}

					{isCreateFormOpen ? (
						<section className="rounded-lg border bg-muted/20 p-4">
							<div className="flex flex-wrap items-end gap-3">
								<div className="min-w-[220px] flex-1 space-y-1.5">
									<Label htmlFor="api-key-label" className="text-xs">
										Key name
									</Label>
									<Input
										id="api-key-label"
										value={keyName}
										onChange={(event) => setKeyName(event.target.value)}
										placeholder="cli-writes-prod"
										className="h-8 rounded-md text-sm"
									/>
								</div>
								<Button
									size="sm"
									onClick={() => void handleCreateKey()}
									disabled={isCreating}
								>
									{isCreating ? (
										<LoaderCircle className="size-3.5 animate-spin" />
									) : (
										<KeyRound className="size-3.5" />
									)}
									Create API key
								</Button>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										setIsCreateFormOpen(false);
										setKeyName("");
									}}
									disabled={isCreating}
								>
									Cancel
								</Button>
							</div>
						</section>
					) : null}

					<section className="space-y-3">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div className="space-y-1">
								<h2 className="text-sm font-medium text-foreground">
									Existing keys
								</h2>
								<p className="text-xs text-muted-foreground">
									{isHydrated
										? `${apiKeys.length} key${apiKeys.length === 1 ? "" : "s"}`
										: "Loading keys"}
								</p>
							</div>
							{isLoadingKeys ? (
								<LoaderCircle className="size-4 animate-spin text-muted-foreground" />
							) : null}
						</div>

						{errorMessage ? (
							<Alert className="border-destructive/30 bg-destructive/8 px-3 py-3 text-destructive">
								<AlertTitle className="text-sm">
									Something went wrong
								</AlertTitle>
								<AlertDescription className="mt-1 text-xs text-destructive">
									{errorMessage}
								</AlertDescription>
							</Alert>
						) : null}

						{!isLoadingKeys && apiKeys.length === 0 ? (
							<div className="rounded-md border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
								No API keys yet.
							</div>
						) : null}

						{apiKeys.length > 0 ? (
							<>
								<div className="hidden overflow-hidden rounded-md border md:block">
									<Table>
										<TableHeader>
											<TableRow className="hover:bg-transparent">
												<TableHead>Name</TableHead>
												<TableHead>Status</TableHead>
												<TableHead>Created</TableHead>
												<TableHead>Last used</TableHead>
												<TableHead className="w-[1%] whitespace-nowrap text-right">
													Actions
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{apiKeys.map((apiKey) => {
												const isBusy = activeKeyId === apiKey.id;
												return (
													<TableRow key={apiKey.id}>
														<TableCell className="font-medium">
															{apiKey.name ?? "Unnamed key"}
														</TableCell>
														<TableCell>
															<StatusBadge enabled={apiKey.enabled} />
														</TableCell>
														<TableCell className="text-muted-foreground">
															{formatDateTime(apiKey.createdAt)}
														</TableCell>
														<TableCell className="text-muted-foreground">
															{formatDateTime(apiKey.lastRequest)}
														</TableCell>
														<TableCell className="text-right">
															<div className="flex justify-end gap-2">
																<Button
																	variant="outline"
																	size="xs"
																	onClick={() =>
																		void handleRevokeKey(apiKey.id)
																	}
																	disabled={isBusy || !apiKey.enabled}
																>
																	{isBusy ? (
																		<LoaderCircle className="size-3 animate-spin" />
																	) : (
																		<XCircle className="size-3" />
																	)}
																	Revoke
																</Button>
																<Button
																	variant="destructive"
																	size="xs"
																	onClick={() =>
																		void handleDeleteKey(apiKey.id)
																	}
																	disabled={isBusy}
																>
																	<Trash2 className="size-3" />
																	Delete
																</Button>
															</div>
														</TableCell>
													</TableRow>
												);
											})}
										</TableBody>
									</Table>
								</div>

								<div className="space-y-4 md:hidden">
									{apiKeys.map((apiKey, index) => {
										const isBusy = activeKeyId === apiKey.id;
										return (
											<div key={apiKey.id} className="space-y-3">
												<div className="space-y-1">
													<div className="flex flex-wrap items-center gap-2">
														<p className="text-sm font-medium text-foreground">
															{apiKey.name ?? "Unnamed key"}
														</p>
														<StatusBadge enabled={apiKey.enabled} />
													</div>
													<div className="space-y-0.5 text-xs text-muted-foreground">
														<p>Created {formatDateTime(apiKey.createdAt)}</p>
														<p>
															Last used {formatDateTime(apiKey.lastRequest)}
														</p>
													</div>
												</div>
												<div className="flex flex-wrap gap-2">
													<Button
														variant="outline"
														size="xs"
														onClick={() => void handleRevokeKey(apiKey.id)}
														disabled={isBusy || !apiKey.enabled}
													>
														{isBusy ? (
															<LoaderCircle className="size-3 animate-spin" />
														) : (
															<XCircle className="size-3" />
														)}
														Revoke
													</Button>
													<Button
														variant="destructive"
														size="xs"
														onClick={() => void handleDeleteKey(apiKey.id)}
														disabled={isBusy}
													>
														<Trash2 className="size-3" />
														Delete
													</Button>
												</div>
												{index < apiKeys.length - 1 ? <Separator /> : null}
											</div>
										);
									})}
								</div>
							</>
						) : null}
					</section>
				</section>
			</div>
		</div>
	);
}

function StatusBadge({ enabled }: { enabled: boolean }) {
	return (
		<Badge
			variant={enabled ? "secondary" : "outline"}
			className={enabled ? "text-emerald-700 dark:text-emerald-300" : ""}
		>
			{enabled ? "Active" : "Revoked"}
		</Badge>
	);
}
