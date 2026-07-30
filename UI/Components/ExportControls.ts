/**
 * Export controls component
 * Creates and manages the export button in the scanner modal
 */

import { App, ButtonComponent, Notice } from "obsidian";
import { ExportModal } from "UI/Modals/ExportModal";
import type HandWrittenPlugin from "../../main";

export class ExportControls {
	private app: App;
	private getCanvas: () => HTMLCanvasElement;
	private plugin: HandWrittenPlugin;
	private isImageLoaded: () => boolean;
	private onExportComplete?: () => void;

	constructor(
		app: App,
		getCanvas: () => HTMLCanvasElement,
		plugin: HandWrittenPlugin,
		isImageLoaded: () => boolean,
		onExportComplete?: () => void,
	) {
		this.app = app;
		this.getCanvas = getCanvas;
		this.plugin = plugin;
		this.isImageLoaded = isImageLoaded;
		this.onExportComplete = onExportComplete;
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
		new ExportModal(this.app, this.getCanvas(), this.plugin, this.onExportComplete).open();
	}
}
