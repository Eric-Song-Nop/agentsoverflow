#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PACKAGE_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const ENTRYPOINT = join(PACKAGE_DIR, "src", "index.ts");
const DIST_DIR = join(PACKAGE_DIR, "dist");
const RELEASE_DIR = join(PACKAGE_DIR, "release");

export const RELEASE_TARGETS = [
	"bun-darwin-arm64",
	"bun-darwin-x64",
	"bun-linux-x64",
	"bun-linux-arm64",
	"bun-windows-x64",
] as const satisfies readonly Bun.Build.CompileTarget[];

export type ReleaseTarget = (typeof RELEASE_TARGETS)[number];

type ReleaseArtifact = {
	filename: string;
	sha256: string;
	target: ReleaseTarget;
};

function assertBuildSuccess(result: Bun.BuildOutput, label: string) {
	if (!result.success) {
		const details = result.logs.map((log) => log.message).join("\n");
		throw new Error(`${label} failed.\n${details}`);
	}
}

function getExecutableExtension(target: ReleaseTarget) {
	return target.startsWith("bun-windows-") ? ".exe" : "";
}

export function getReleaseFilename(target: ReleaseTarget) {
	const platformName = target.replace(/^bun-/, "");
	return `agentsoverflow-${platformName}${getExecutableExtension(target)}`;
}

export function getHostReleaseTarget() {
	const platform = process.platform;
	const arch = process.arch;

	if (platform === "darwin" && arch === "arm64") {
		return "bun-darwin-arm64";
	}
	if (platform === "darwin" && arch === "x64") {
		return "bun-darwin-x64";
	}
	if (platform === "linux" && arch === "x64") {
		return "bun-linux-x64";
	}
	if (platform === "linux" && arch === "arm64") {
		return "bun-linux-arm64";
	}
	if (platform === "win32" && arch === "x64") {
		return "bun-windows-x64";
	}

	throw new Error(`Unsupported host target: ${platform}-${arch}`);
}

async function sha256(filePath: string) {
	const bytes = await Bun.file(filePath).bytes();
	const hash = createHash("sha256");
	hash.update(bytes);
	return hash.digest("hex");
}

export async function bundleCli() {
	await rm(DIST_DIR, { force: true, recursive: true });
	await mkdir(DIST_DIR, { recursive: true });

	const result = await Bun.build({
		entrypoints: [ENTRYPOINT],
		format: "esm",
		outdir: DIST_DIR,
		packages: "bundle",
		sourcemap: "none",
		target: "bun",
	});

	assertBuildSuccess(result, "Bundle build");
}

export async function compileExecutable(
	target: ReleaseTarget,
	outfile: string,
) {
	await mkdir(dirname(outfile), { recursive: true });

	const result = await Bun.build({
		bytecode: true,
		compile: {
			autoloadBunfig: false,
			autoloadDotenv: false,
			autoloadPackageJson: false,
			autoloadTsconfig: false,
			outfile,
			target,
			windows: target.startsWith("bun-windows-")
				? {
						hideConsole: true,
					}
				: undefined,
		},
		entrypoints: [ENTRYPOINT],
		minify: true,
		packages: "bundle",
		sourcemap: "none",
		target: "bun",
	});

	assertBuildSuccess(result, `Compile ${target}`);
	return outfile;
}

export async function buildReleaseArtifacts() {
	await rm(RELEASE_DIR, { force: true, recursive: true });
	await mkdir(RELEASE_DIR, { recursive: true });

	const artifacts: ReleaseArtifact[] = [];

	for (const target of RELEASE_TARGETS) {
		const filename = getReleaseFilename(target);
		const outfile = join(RELEASE_DIR, filename);
		await compileExecutable(target, outfile);
		artifacts.push({
			filename,
			sha256: await sha256(outfile),
			target,
		});
	}

	const checksums = artifacts
		.map((artifact) => `${artifact.sha256}  ${artifact.filename}`)
		.join("\n");

	await writeFile(join(RELEASE_DIR, "checksums.txt"), `${checksums}\n`);
	await writeFile(
		join(RELEASE_DIR, "manifest.json"),
		`${JSON.stringify({ artifacts }, null, 2)}\n`,
	);

	return artifacts;
}

async function main() {
	const command = Bun.argv[2] ?? "bundle";

	if (command === "bundle") {
		await bundleCli();
		return;
	}

	if (command === "compile-host") {
		await rm(join(DIST_DIR, "compiled"), { force: true, recursive: true });
		const target = getHostReleaseTarget();
		const outfile = join(
			DIST_DIR,
			"compiled",
			`agentsoverflow${getExecutableExtension(target)}`,
		);
		await compileExecutable(target, outfile);
		return;
	}

	if (command === "release") {
		await buildReleaseArtifacts();
		return;
	}

	throw new Error(`Unknown build command '${command}'.`);
}

if (import.meta.main) {
	await main();
}
