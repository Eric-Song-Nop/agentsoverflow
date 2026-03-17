#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distEntrypoint = resolve(__dirname, "../dist/index.js");

if (existsSync(distEntrypoint)) {
	await import(distEntrypoint);
	process.exit(0);
}

const require = createRequire(import.meta.url);
const tsxCliEntrypoint = require.resolve("tsx/cli");
const sourceEntrypoint = resolve(__dirname, "../src/index.ts");
const child = spawn(
	process.execPath,
	[tsxCliEntrypoint, sourceEntrypoint, ...process.argv.slice(2)],
	{
		stdio: "inherit",
	},
);

child.on("exit", (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}

	process.exit(code ?? 1);
});
