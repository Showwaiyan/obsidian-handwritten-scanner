import { App, Modal, Notice } from "obsidian";
import { ImagePreview } from "UI/Components/ImagePreview";

export class ScannerModal extends Modal {
	private container: HTMLElement;
	private canvas: ImagePreview;

	constructor(app: App) {
		super(app);
		this.setTitle("Scan Your Note");
		this.modalEl.addClass("scanner-modal");
		this.container = this.contentEl.createDiv("scanner-modal-container");
		this.canvas = new ImagePreview(
			this.container,
			this.container.createEl("canvas",{
				cls: ""
			}),
			3/4
		);
	}

	async onOpen() {
		new Notice("Scan-Sketch plugin loaded");
		
		this.canvas.setup();
	}

	async onClose() {}
}
