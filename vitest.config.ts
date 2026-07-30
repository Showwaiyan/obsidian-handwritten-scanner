import { defineConfig } from "vitest/config";
import * as path from "path";

export default defineConfig({
	test: {
		globals: true,
		environment: "happy-dom",
		setupFiles: ["./test/setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"test/",
				"*.config.*",
				"main.ts",
				"version-bump.mjs",
			],
		},
	},
	resolve: {
		alias: {
			obsidian: path.resolve(__dirname, "./test/mocks/obsidian.ts"),
			Services: path.resolve(__dirname, "./Services"),
			UI: path.resolve(__dirname, "./UI"),
		},
	},
});
