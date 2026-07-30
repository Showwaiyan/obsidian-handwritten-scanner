import { describe, it, expect } from "vitest";
import { App } from "obsidian";
import { ExportModal } from "UI/Modals/ExportModal";
import { ExportControls } from "UI/Components/ExportControls";

describe("ExportFolders", () => {
	it("should initialize ExportModal with first folder from exportFolders", () => {
		const mockApp = {} as App;
		const canvas = document.createElement("canvas");
		const folders = ["FolderA", "FolderB", "FolderC"];

		const modal = new ExportModal(mockApp, canvas, folders);
		expect((modal as any).exportFolders).toEqual(["FolderA", "FolderB", "FolderC"]);
		expect((modal as any).selectedFolder).toBe("FolderA");
	});

	it("should fallback to ['Scanned'] if exportFolders is empty", () => {
		const mockApp = {} as App;
		const canvas = document.createElement("canvas");

		const modal = new ExportModal(mockApp, canvas, []);
		expect((modal as any).exportFolders).toEqual(["Scanned"]);
		expect((modal as any).selectedFolder).toBe("Scanned");
	});

	it("should pass exportFolders through ExportControls to ExportModal", () => {
		const mockApp = {} as App;
		const canvas = document.createElement("canvas");
		const folders = ["Notes/Scans", "Projects/Drafts"];

		const controls = new ExportControls(
			mockApp,
			() => canvas,
			folders,
			() => true,
		);

		expect((controls as any).exportFolders).toEqual(folders);
	});
});
