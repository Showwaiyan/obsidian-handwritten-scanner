/**
 * Export controls component
 * Creates and manages the export button in the scanner modal
 */

import { App, ButtonComponent, Notice } from "obsidian";
import { ExportModal } from "UI/Modals/ExportModal";

export class ExportControls {
	private app: App;
	private getCanvas: () => HTMLCanvasElement;
	private exportFolders: string[];
	private isImageLoaded: () => boolean;

	constructor(
		app: App,
		getCanvas: () => HTMLCanvasElement,
		exportFolders: string[],
		isImageLoaded: () => boolean,
	) {
		this.app = app;
		this.getCanvas = getCanvas;
		this.exportFolders = exportFolders;
		this.isImageLoaded = isImageLoaded;
	}

	/**
	 * Create export button for button wrapper
	 * @param container - Button wrapper element
	 * @returns Export button component
	 */
	public createExportButton(container: HTMLElement): ButtonComponent {
		return new ButtonComponent(container)
			.setIcon("download")
			.setTooltip("Export image")
			.onClick(() => this.handleExportClick());
	}

	private handleExportClick(): void {
		// Check if image loaded
		if (!this.isImageLoaded()) {
			new Notice("Please upload photo first!");
			return;
		}

		// Open export modal
		new ExportModal(this.app, this.getCanvas(), this.exportFolders).open();
	}
}
