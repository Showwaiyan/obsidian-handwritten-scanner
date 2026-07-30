/**
 * Export modal for PNG/SVG export options
 * Provides UI for format selection, filename input, and folder configuration
 */

import { App, Modal, Notice, ButtonComponent, TextComponent, DropdownComponent } from "obsidian";
import {
	generateDefaultFilename,
	validateFilename,
	exportCanvasToPNG,
	exportCanvasToSVG,
	getFileExtension,
	type ExportFormat,
} from "../../Services/ImageExport";
import { saveToVault } from "../../Services/VaultExport";

export class ExportModal extends Modal {
	private canvas: HTMLCanvasElement;
	private exportFolders: string[];
	private selectedFolder: string;
	private selectedFormat: ExportFormat = "png";
	private filenameInput: TextComponent;
	private extensionDisplay: HTMLElement;
	private pngRadio: HTMLInputElement;
	private svgRadio: HTMLInputElement;
	private svgColorSection: HTMLElement;
	private svgColorInput: HTMLInputElement;
	private svgTintColor: string = "";

	constructor(app: App, canvas: HTMLCanvasElement, exportFolders: string[]) {
		super(app);
		this.canvas = canvas;
		this.exportFolders =
			exportFolders && exportFolders.length > 0 ? exportFolders : ["Scanned"];
		this.selectedFolder = this.exportFolders[0];
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

		// Folder display
		this.buildFolderDisplay(contentEl);

		// Action buttons
		this.buildActionButtons(contentEl);
	}

	private buildSvgColorPicker(container: HTMLElement): void {
		this.svgColorSection = container.createDiv("export-svg-color-section");
		this.svgColorSection.style.display = "none";

		const heading = this.svgColorSection.createEl("h4");
		heading.textContent = "Image color:";

		const wrapper = this.svgColorSection.createDiv("export-svg-color-wrapper");
		this.svgColorInput = wrapper.createEl("input", {
			type: "color",
			attr: { id: "svg-tint-color" },
		}) as HTMLInputElement;

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
		this.pngRadio.checked = true;
		this.pngRadio.addEventListener("change", () => {
			this.selectedFormat = "png";
			this.svgColorSection.style.display = "none";
			this.updateExtensionDisplay();
		});

		const pngLabel = pngOption.createEl("label", {
			attr: { for: "format-png" },
		});
		pngLabel.textContent = "PNG";

		// SVG radio option
		const svgOption = optionsWrapper.createDiv("export-format-option");
		this.svgRadio = svgOption.createEl("input", {
			type: "radio",
			attr: { name: "export-format", id: "format-svg" },
		});
		this.svgRadio.addEventListener("change", () => {
			this.selectedFormat = "svg";
			this.svgColorSection.style.display = "";
			this.updateExtensionDisplay();
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
			.onClick(() => this.handleExport());

		// Cancel button
		new ButtonComponent(buttonWrapper)
			.setButtonText("Cancel")
			.onClick(() => this.close());
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

				// Hide processing notice
				processingNotice.hide();

				// Show success notice
				new Notice(`Exported to ${file.path}`, 3000);

				// Close modal
				this.close();
			} catch (error) {
				// Hide processing notice
				processingNotice.hide();

				// Show error notice
				new Notice(error.message, 5000);
			}
		} catch (error) {
			console.error("Export error:", error);
			new Notice(
				`Export failed: ${error.message}\nCheck console for details.`,
				6000,
			);
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}
