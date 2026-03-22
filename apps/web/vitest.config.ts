import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		viteTsConfigPaths({
			projects: ["./tsconfig.json"],
		}),
		viteReact(),
	],
	test: {
		clearMocks: true,
		environment: "jsdom",
		exclude: ["e2e/**", "node_modules/**", "test-results/**"],
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
		restoreMocks: true,
		setupFiles: ["./src/test/setup.ts"],
	},
});
