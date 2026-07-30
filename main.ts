import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";
import type { ExportFormat } from "./Services/ImageExport";

interface HandwrittenScannerSettings {
	exportDefaultFolder?: string;
	exportFolders: string[];
	exportDefaultFormat: ExportFormat;
	closeAfterExport: boolean;
}

const DEFAULT_SETTINGS: HandwrittenScannerSettings = {
	exportFolders: ["Scanned"],
	exportDefaultFormat: "png",
	closeAfterExport: true,
};

export default class HandWrittenPlugin extends Plugin {
	settings: HandwrittenScannerSettings;

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		this.addRibbonIcon("scan", "Scanner", async (_evt: MouseEvent) => {
			// Called when the user clicks the icon.
			// Lazy load ScannerModal only when needed
			const { ScannerModal } = await import("./UI/Modals/scannerModal");
			new ScannerModal(this.app, this).open();
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-sketch-scanner",
			name: "Open sketch scanner",
			icon: "scan",
			callback: async () => {
				// Lazy load ScannerModal only when needed
				const { ScannerModal } = await import("./UI/Modals/scannerModal");
				new ScannerModal(this.app, this).open();
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new HandwrittenScannerSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData() as Partial<HandwrittenScannerSettings> | null) || {},
		);

		// Migration / Fallback: If exportFolders is empty or not an array, use exportDefaultFolder or default to ["Scanned"]
		if (
			!Array.isArray(this.settings.exportFolders) ||
			this.settings.exportFolders.length === 0
		) {
			if (
				this.settings.exportDefaultFolder &&
				typeof this.settings.exportDefaultFolder === "string"
			) {
				this.settings.exportFolders = [this.settings.exportDefaultFolder];
			} else {
				this.settings.exportFolders = ["Scanned"];
			}
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class HandwrittenScannerSettingTab extends PluginSettingTab {
	plugin: HandWrittenPlugin;

	constructor(app: App, plugin: HandWrittenPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions() {
		return [
			{
				id: "exportFolders",
				name: "Destination folders",
				description: "Manage destination folders for saving scanned images.",
			},
			{
				id: "exportDefaultFormat",
				name: "Default export format",
				description: "Default file format for exporting scanned images",
			},
			{
				id: "closeAfterExport",
				name: "Close scanner after export",
				description: "Automatically close the scanner window after successfully exporting an image",
			},
		];
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Destination folders")
			.setDesc(
				"Manage destination folders for saving scanned images. In the export dialog, you can choose from these folders using a dropdown menu.",
			);

		const folders = this.plugin.settings.exportFolders;

		folders.forEach((folderPath, index) => {
			new Setting(containerEl)
				.setName(folderPath.trim() === "" ? "Root folder (/)" : folderPath)
				.addButton((button) => {
					button
						.setButtonText("Delete")
						.setIcon("trash")
						.setWarning()
						.setTooltip("Remove this destination folder")
						.onClick(async () => {
							if (folders.length <= 1) {
								new Notice("You must keep at least one destination folder.");
								return;
							}
							folders.splice(index, 1);
							await this.plugin.saveSettings();
							this.display();
						});
				});
		});

		let newFolderPath = "";
		new Setting(containerEl)
			.setName("Add new destination folder")
			.setDesc("Enter a folder path (e.g., 'Scanned' or 'Notes/Scans')")
			.addText((text) => {
				text
					.setPlaceholder("Folder path")
					.setValue(newFolderPath)
					.onChange((val) => {
						newFolderPath = val;
					});
			})
			.addButton((button) => {
				button
					.setButtonText("Add folder")
					.setCta()
					.onClick(async () => {
						const trimmed = newFolderPath.trim();
						if (folders.includes(trimmed)) {
							new Notice("This folder is already in your destination list.");
							return;
						}
						folders.push(trimmed);
						await this.plugin.saveSettings();
						this.display();
					});
			});

		new Setting(containerEl)
			.setName("Default export format")
			.setDesc("Default file format for exporting scanned images")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("png", "PNG")
					.addOption("jpg", "JPG")
					.addOption("svg", "SVG")
					.setValue(this.plugin.settings.exportDefaultFormat || "png")
					.onChange(async (value: ExportFormat) => {
						this.plugin.settings.exportDefaultFormat = value;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Close scanner after export")
			.setDesc("Automatically close the scanner window after successfully exporting an image")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.closeAfterExport ?? true)
					.onChange(async (value) => {
						this.plugin.settings.closeAfterExport = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
