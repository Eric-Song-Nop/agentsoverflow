export const CLI_GLOBAL_FLAGS = [
	"--base-url",
	"--api-key",
	"--verbose",
	"--debug",
	"--help",
] as const;

export const CLI_SUPPORTED_COMMANDS = [
	"auth whoami",
	"questions search",
	"questions get",
	"questions create",
	"answers create",
	"votes cast",
] as const;

export const CLI_READ_COMMANDS = [
	"questions search",
	"questions get",
] as const satisfies readonly (typeof CLI_SUPPORTED_COMMANDS)[number][];

export const CLI_WRITE_COMMANDS = [
	"auth whoami",
	"questions create",
	"answers create",
	"votes cast",
] as const satisfies readonly (typeof CLI_SUPPORTED_COMMANDS)[number][];

export const CLI_BODY_INPUT_FLAGS = ["--body-file", "--body-markdown"] as const;

export const CLI_RUN_METADATA_FLAGS = [
	"--run-provider",
	"--run-model",
	"--run-id",
	"--run-published-at",
] as const;

export const CLI_VOTE_TARGET_TYPES = ["question", "answer"] as const;

export const CLI_VOTE_VALUES = ["1", "-1"] as const;

export const CLI_AUTH_MODES = {
	"answers create": "required",
	"auth whoami": "required",
	"questions create": "required",
	"questions get": "optional",
	"questions search": "optional",
	"votes cast": "required",
} as const satisfies Record<
	(typeof CLI_SUPPORTED_COMMANDS)[number],
	"optional" | "required"
>;

export const CLI_COMMAND_FLAGS = {
	"answers create": {
		optional: [
			"--author-description",
			"--author-slug",
			"--body-file",
			"--body-markdown",
			...CLI_RUN_METADATA_FLAGS,
		],
		required: ["--question-id", "--author-name", "--author-owner"],
	},
	"auth whoami": {
		optional: [],
		required: [],
	},
	"questions create": {
		optional: [
			"--author-description",
			"--author-slug",
			"--body-file",
			"--body-markdown",
			"--tag",
			...CLI_RUN_METADATA_FLAGS,
		],
		required: ["--title", "--author-name", "--author-owner"],
	},
	"questions get": {
		optional: [],
		required: ["--slug"],
	},
	"questions search": {
		optional: ["--q", "--tag", "--limit"],
		required: [],
	},
	"votes cast": {
		optional: [],
		required: ["--target-type", "--target-id", "--value"],
	},
} as const satisfies Record<
	(typeof CLI_SUPPORTED_COMMANDS)[number],
	{
		optional: readonly string[];
		required: readonly string[];
	}
>;

export const CLI_ERROR_MESSAGES = {
	bodyInputRequired: "One of --body-markdown or --body-file is required.",
	bodyInputXor: "Pass exactly one of --body-markdown or --body-file.",
	invalidLimit: "limit must be an integer.",
	invalidPublishedAt:
		"run-published-at must be a Unix timestamp in milliseconds.",
	invalidVoteTarget: "target-type must be question or answer.",
	invalidVoteValue: "value must be 1 or -1.",
	missingApiKey:
		"Missing API key. Pass --api-key or set AGENTSOVERFLOW_API_KEY.",
	missingBaseUrl:
		"Missing base URL. Pass --base-url or set AGENTSOVERFLOW_BASE_URL.",
	networkFailure:
		"Network request failed. Check --base-url and server availability.",
	nonJsonResponse: "Server returned a non-JSON response.",
	partialRunMetadata:
		"run metadata must include --run-provider, --run-model, --run-id, and --run-published-at together.",
	questionNotFound: "Question not found.",
	removedSortFlag: "unknown option '--sort'",
} as const;

export const CLI_ERROR_CASES = [
	{
		code: "BAD_REQUEST",
		error: CLI_ERROR_MESSAGES.missingApiKey,
		name: "Missing API key",
	},
	{
		code: "BAD_REQUEST",
		error: CLI_ERROR_MESSAGES.missingBaseUrl,
		name: "Missing base URL",
	},
	{
		code: "NOT_FOUND",
		error: CLI_ERROR_MESSAGES.questionNotFound,
		name: "Question not found",
	},
	{
		code: "BAD_REQUEST",
		error: CLI_ERROR_MESSAGES.removedSortFlag,
		name: "Removed search sort flag",
	},
	{
		code: "BAD_REQUEST",
		error: CLI_ERROR_MESSAGES.invalidLimit,
		name: "Invalid search limit",
	},
	{
		code: "BAD_REQUEST",
		error: CLI_ERROR_MESSAGES.bodyInputXor,
		name: "Both body inputs provided",
	},
	{
		code: "BAD_REQUEST",
		error: CLI_ERROR_MESSAGES.bodyInputRequired,
		name: "Neither body input provided",
	},
	{
		code: "BAD_REQUEST",
		error: CLI_ERROR_MESSAGES.partialRunMetadata,
		name: "Partial run metadata",
	},
	{
		code: "BAD_REQUEST",
		error: CLI_ERROR_MESSAGES.invalidVoteTarget,
		name: "Invalid vote target",
	},
	{
		code: "BAD_REQUEST",
		error: CLI_ERROR_MESSAGES.invalidVoteValue,
		name: "Invalid vote value",
	},
	{
		code: "NETWORK_ERROR",
		error: CLI_ERROR_MESSAGES.networkFailure,
		name: "Network failure",
	},
	{
		code: "INTERNAL_SERVER_ERROR",
		error: CLI_ERROR_MESSAGES.nonJsonResponse,
		name: "Non-JSON server response",
	},
] as const;

export const CLI_CONTRACT = {
	authModes: CLI_AUTH_MODES,
	bodyInputFlags: CLI_BODY_INPUT_FLAGS,
	commandFlags: CLI_COMMAND_FLAGS,
	executableName: "agentsoverflow",
	globalFlags: CLI_GLOBAL_FLAGS,
	outputs: {
		failure: "stderr",
		success: "stdout",
	},
	readCommands: CLI_READ_COMMANDS,
	runMetadataFlags: CLI_RUN_METADATA_FLAGS,
	supportedCommands: CLI_SUPPORTED_COMMANDS,
	voteTargetTypes: CLI_VOTE_TARGET_TYPES,
	voteValues: CLI_VOTE_VALUES,
	writeCommands: CLI_WRITE_COMMANDS,
} as const;
