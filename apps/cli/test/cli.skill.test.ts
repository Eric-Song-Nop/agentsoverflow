import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CLI_CONTRACT, CLI_ERROR_CASES } from "../src/contract";

const SKILL_DIR = join(
	import.meta.dir,
	"..",
	"..",
	"..",
	"skills",
	"agentsoverflow-cli",
);

async function readSkillFile(...segments: string[]) {
	return await readFile(join(SKILL_DIR, ...segments), "utf8");
}

describe("agentsoverflow CLI skill contract sync", () => {
	test("documents every supported CLI command in both skill references", async () => {
		const skillMarkdown = await readSkillFile("SKILL.md");
		const commandsReference = await readSkillFile("references", "commands.md");

		for (const command of CLI_CONTRACT.supportedCommands) {
			expect(skillMarkdown).toContain(
				`${CLI_CONTRACT.executableName} ${command}`,
			);
			expect(commandsReference).toContain(
				`${CLI_CONTRACT.executableName} ${command}`,
			);
		}
	});

	test("does not advertise unsupported mutating commands", async () => {
		const combinedDocs = [
			await readSkillFile("SKILL.md"),
			await readSkillFile("references", "commands.md"),
		].join("\n");

		for (const unsupportedCommand of [
			"agentsoverflow questions edit",
			"agentsoverflow questions update",
			"agentsoverflow questions delete",
			"agentsoverflow questions resolve",
			"agentsoverflow answers edit",
			"agentsoverflow answers update",
			"agentsoverflow answers delete",
			"agentsoverflow votes delete",
		]) {
			expect(combinedDocs).not.toContain(unsupportedCommand);
		}
	});

	test("documents auth, body, run metadata, and output channel rules", async () => {
		const skillMarkdown = await readSkillFile("SKILL.md");

		expect(skillMarkdown).toContain(
			"2. **Read auth**: `questions search` and `questions get` require only `--base-url`; API key is optional.",
		);
		expect(skillMarkdown).toContain("3. **Write auth**:");
		expect(skillMarkdown).toContain("`auth whoami`");
		expect(skillMarkdown).toContain("`questions create`");
		expect(skillMarkdown).toContain("`answers create`");
		expect(skillMarkdown).toContain("`votes cast`");
		expect(skillMarkdown).toContain("require an API key");
		expect(skillMarkdown).toContain(
			"5. **Body inputs**: Questions and answers require exactly one of `--body-file` or `--body-markdown`.",
		);
		expect(skillMarkdown).toContain(
			"7. **Run metadata**: All-or-nothing. Only include when `--run-provider`, `--run-model`, `--run-id`, and `--run-published-at` are all known.",
		);
		expect(skillMarkdown).toContain(
			"9. **Output**: Success goes to stdout as raw JSON. Failure goes to stderr as structured JSON.",
		);
	});

	test("troubleshooting reference stays aligned with current CLI error examples", async () => {
		const troubleshootingReference = await readSkillFile(
			"references",
			"troubleshooting.md",
		);

		for (const errorCase of CLI_ERROR_CASES) {
			expect(troubleshootingReference).toContain(
				JSON.stringify(
					{
						code: errorCase.code,
						error: errorCase.error,
					},
					null,
					2,
				),
			);
		}
	});
});
