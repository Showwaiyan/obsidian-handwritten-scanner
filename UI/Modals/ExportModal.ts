/**
 * Export modal for PNG/JPG/SVG export options
 * Provides UI for format selection, filename input, and folder configuration
 */

import { App, Modal, Notice, ButtonComponent, TextComponent, DropdownComponent } from "obsidian";
import type HandWrittenPlugin from "../../main";
import {
	generateDefaultFilename,
	validateFilename,
	exportCanvasToPNG,
	exportCanvasToJPG,
	exportCanvasToSVG,
	getFileExtension,
	type ExportFormat,
} from "../../Services/ImageExport";
import { saveToVault } from "../../Services/VaultExport";

export class ExportModal extends Modal {
	private canvas: HTMLCanvasElement;
	private plugin: HandWrittenPlugin;
	private exportFolders: string[];
	private selectedFolder: string;
	private selectedFormat: ExportFormat;
	private filenameInput: TextComponent;
	private extensionDisplay: HTMLElement;
	private pngRadio: HTMLInputElement;
	private jpgRadio: HTMLInputElement;
	private svgRadio: HTMLInputElement;
	private svgColorSection: HTMLElement;
	private svgColorInput: HTMLInputElement;
	private svgTintColor: string = "";
	private insertLinkCheckbox: HTMLInputElement;
	private shouldInsertLink: boolean = true;
	private onExportComplete?: () => void;

	constructor(app: App, canvas: HTMLCanvasElement, plugin: HandWrittenPlugin, onExportComplete?: () => void) {
		super(app);
		this.canvas = canvas;
		this.plugin = plugin;
		this.selectedFormat = plugin.settings.exportDefaultFormat || "png";
		this.exportFolders =
			plugin.settings.exportFolders && plugin.settings.exportFolders.length > 0
				? plugin.settings.exportFolders
				: ["Scanned"];
		this.selectedFolder = this.exportFolders[0];
		this.onExportComplete = onExportComplete;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass("export-modal");
		this.setTitle("Export scanned image");

		// Format selector
		this.buildFormatSelector(contentEl);

		// SVG color picker (hidden until SVG is selected)
		this.buildSvgColorPicker(contentEl);

		// Filename input
		this.buildFilenameInput(contentEl);

		// Insert link checkbox
		this.buildInsertLinkCheckbox(contentEl);

		// Folder display
		this.buildFolderDisplay(contentEl);

		// Action buttons
		this.buildActionButtons(contentEl);
	}

	private buildSvgColorPicker(container: HTMLElement): void {
		this.svgColorSection = container.createDiv("export-svg-color-section");
		this.svgColorSection.hide();

		const heading = this.svgColorSection.createEl("h4");
		heading.textContent = "Stroke color:";

		const wrapper = this.svgColorSection.createDiv("export-svg-color-wrapper");
		this.svgColorInput = wrapper.createEl("input", {
			type: "color",
			attr: { id: "svg-tint-color" },
		});

		const label = wrapper.createEl("label", {
			attr: { for: "svg-tint-color" },
		});
		this.svgColorInput.value = "#000000";
		label.textContent = "Black";

		this.svgColorInput.addEventListener("input", () => {
			this.svgTintColor = this.svgColorInput.value;
			label.textContent = this.svgColorInput.value;
		});
	}

	private buildFormatSelector(container: HTMLElement): void {
		const section = container.createDiv("export-format-section");

		const heading = section.createEl("h4");
		heading.textContent = "Format:";

		const optionsWrapper = section.createDiv("export-format-options");

		// PNG radio option
		const pngOption = optionsWrapper.createDiv("export-format-option");
		this.pngRadio = pngOption.createEl("input", {
			type: "radio",
			attr: { name: "export-format", id: "format-png" },
		});
		this.pngRadio.checked = this.selectedFormat === "png";
		this.pngRadio.addEventListener("change", () => {
			this.selectedFormat = "png";
			this.svgColorSection.hide();
			this.updateExtensionDisplay();
			this.saveFormatPreference();
		});

		const pngLabel = pngOption.createEl("label", {
			attr: { for: "format-png" },
		});
		pngLabel.textContent = "PNG";

		// JPG radio option
		const jpgOption = optionsWrapper.createDiv("export-format-option");
		this.jpgRadio = jpgOption.createEl("input", {
			type: "radio",
			attr: { name: "export-format", id: "format-jpg" },
		});
		this.jpgRadio.checked = this.selectedFormat === "jpg";
		this.jpgRadio.addEventListener("change", () => {
			this.selectedFormat = "jpg";
			this.svgColorSection.hide();
			this.updateExtensionDisplay();
			this.saveFormatPreference();
		});

		const jpgLabel = jpgOption.createEl("label", {
			attr: { for: "format-jpg" },
		});
		jpgLabel.textContent = "JPG";

		// SVG radio option
		const svgOption = optionsWrapper.createDiv("export-format-option");
		this.svgRadio = svgOption.createEl("input", {
			type: "radio",
			attr: { name: "export-format", id: "format-svg" },
		});
		this.svgRadio.checked = this.selectedFormat === "svg";
		this.svgRadio.addEventListener("change", () => {
			this.selectedFormat = "svg";
			this.svgColorSection.show();
			this.updateExtensionDisplay();
			this.saveFormatPreference();
		});

		const svgLabel = svgOption.createEl("label", {
			attr: { for: "format-svg" },
		});
		svgLabel.textContent = "SVG";
	}

	private buildFilenameInput(container: HTMLElement): void {
		const section = container.createDiv("export-filename-section");

		const heading = section.createEl("h4");
		heading.textContent = "Filename:";

		const inputWrapper = section.createDiv("export-filename-wrapper");

		// Filename input
		this.filenameInput = new TextComponent(inputWrapper);
		this.filenameInput.inputEl.addClass("export-filename-input");
		this.filenameInput.setPlaceholder(generateDefaultFilename());

		// Extension display
		this.extensionDisplay = inputWrapper.createDiv(
			"export-filename-extension",
		);
		this.updateExtensionDisplay();
	}

	private buildInsertLinkCheckbox(container: HTMLElement): void {
		const section = container.createDiv("export-insert-link-section");

		const wrapper = section.createDiv("export-insert-link-wrapper");
		this.insertLinkCheckbox = wrapper.createEl("input", {
			type: "checkbox",
			attr: { id: "insert-link-checkbox" },
		});
		this.insertLinkCheckbox.checked = true;
		this.insertLinkCheckbox.addEventListener("change", () => {
			this.shouldInsertLink = this.insertLinkCheckbox.checked;
		});

		const label = wrapper.createEl("label", {
			attr: { for: "insert-link-checkbox" },
		});
		label.textContent = "Insert markdown link into current note";
	}

	private buildFolderDisplay(container: HTMLElement): void {
		const section = container.createDiv("export-folder-section");

		const heading = section.createEl("h4");
		heading.textContent = "Save to destination folder:";

		const dropdownWrapper = section.createDiv("export-folder-dropdown-wrapper");
		const dropdown = new DropdownComponent(dropdownWrapper);
		dropdown.selectEl.addClass("export-folder-select");

		for (const folder of this.exportFolders) {
			const displayLabel = folder.trim() === "" ? "Root folder (/)" : folder;
			dropdown.addOption(folder, displayLabel);
		}

		dropdown.setValue(this.selectedFolder);
		dropdown.onChange((value) => {
			this.selectedFolder = value;
		});

		const note = section.createDiv("export-folder-note");
		note.textContent = "(manage destination folders in plugin settings)";
	}

	private buildActionButtons(container: HTMLElement): void {
		const buttonWrapper = container.createDiv("export-buttons");

		// Export button
		new ButtonComponent(buttonWrapper)
			.setButtonText("Export")
			.setIcon("download")
			.setCta()
			.onClick(() => {
				void this.handleExport();
			});

		// Cancel button
		new ButtonComponent(buttonWrapper)
			.setButtonText("Cancel")
			.onClick(() => this.close());
	}

	private saveFormatPreference(): void {
		this.plugin.settings.exportDefaultFormat = this.selectedFormat;
		void this.plugin.saveSettings();
	}

	private updateExtensionDisplay(): void {
		if (this.extensionDisplay) {
			this.extensionDisplay.textContent = getFileExtension(
				this.selectedFormat,
			);
		}
	}

	private async handleExport(): Promise<void> {
		try {
			// Get filename (use placeholder if empty)
			let filename = this.filenameInput.getValue().trim();
			if (!filename) {
				filename = this.filenameInput.inputEl.placeholder;
			}

			// Validate filename
			const validation = validateFilename(filename);
			if (!validation.valid) {
				new Notice(validation.message, 5000);
				return;
			}

			// Add extension
			const filenameWithExtension =
				filename + getFileExtension(this.selectedFormat);

			// Show processing notice
			const processingNotice = new Notice("Exporting...", 0);

			try {
				// Export canvas based on format
				let blob: Blob;
				if (this.selectedFormat === "png") {
					blob = await exportCanvasToPNG(this.canvas);
				} else if (this.selectedFormat === "jpg") {
					blob = await exportCanvasToJPG(this.canvas);
				} else {
					blob = exportCanvasToSVG(
						this.canvas,
						this.svgTintColor || undefined,
					);
				}

				// Save to vault
				const file = await saveToVault(
					this.app.vault,
					this.selectedFolder,
					filenameWithExtension,
					blob,
				);

				// Insert markdown link if checkbox is checked
				if (this.shouldInsertLink) {
					const activeFile = this.app.workspace.getActiveFile();
					if (activeFile) {
						const editor = this.app.workspace.activeEditor?.editor;
						if (editor) {
							// Create markdown link to the image
							const markdownLink = `![[${file.path}]]`;
							// Insert at cursor position
							const cursor = editor.getCursor();
							editor.replaceRange(markdownLink + "\n", cursor);
						}
					}
				}

				// Hide processing notice
				processingNotice.hide();

				// Show success notice
				new Notice(`Exported to ${file.path}`, 3000);

				// Close modal
				this.close();
				// Call the completion callback to close scanner modal if enabled
				if (this.plugin.settings.closeAfterExport && this.onExportComplete) {
					this.onExportComplete();
				}
			} catch (error) {
				// Hide processing notice
				processingNotice.hide();

				// Show error notice
				const msg = error instanceof Error ? error.message : String(error);
				new Notice(msg, 5000);
			}
		} catch (error) {
			console.error("Export error:", error);
			const msg = error instanceof Error ? error.message : String(error);
			new Notice(
				`Export failed: ${msg}\nCheck console for details.`,
				6000,
			);
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}
