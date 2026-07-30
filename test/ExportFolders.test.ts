import { describe, it, expect } from "vitest";
import { App } from "obsidian";
import { ExportModal } from "UI/Modals/ExportModal";
import { ExportControls } from "UI/Components/ExportControls";

describe("ExportFolders", () => {
	it("should initialize ExportModal with first folder from exportFolders", () => {
		const mockApp = {} as App;
		const canvas = document.createElement("canvas");
		const mockPlugin = {
			settings: {
				exportFolders: ["FolderA", "FolderB", "FolderC"],
				exportDefaultFormat: "png",
				closeAfterExport: true,
			},
		} as any;

		const modal = new ExportModal(mockApp, canvas, mockPlugin);
		expect((modal as any).exportFolders).toEqual(["FolderA", "FolderB", "FolderC"]);
		expect((modal as any).selectedFolder).toBe("FolderA");
	});

	it("should fallback to ['Scanned'] if exportFolders is empty", () => {
		const mockApp = {} as App;
		const canvas = document.createElement("canvas");
		const mockPlugin = {
			settings: {
				exportFolders: [],
				exportDefaultFormat: "png",
				closeAfterExport: true,
			},
		} as any;

		const modal = new ExportModal(mockApp, canvas, mockPlugin);
		expect((modal as any).exportFolders).toEqual(["Scanned"]);
		expect((modal as any).selectedFolder).toBe("Scanned");
	});

	it("should pass plugin through ExportControls to ExportModal", () => {
		const mockApp = {} as App;
		const canvas = document.createElement("canvas");
		const mockPlugin = {
			settings: {
				exportFolders: ["Notes/Scans", "Projects/Drafts"],
				exportDefaultFormat: "png",
				closeAfterExport: true,
			},
		} as any;

		const controls = new ExportControls(
			mockApp,
			() => canvas,
			mockPlugin,
			() => true,
		);

		expect((controls as any).plugin).toBe(mockPlugin);
	});
});
