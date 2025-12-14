import { App, Modal, Notice } from "obsidian";

export class ScannerModal extends Modal {
	private container: HTMLElement;

	constructor(app: App) {
		super(app);
		this.setTitle("Scan Your Note");
		this.container = this.contentEl.createDiv("scanner-modal-container");
	}

	async onOpen() {
		new Notice("Scan-Sketch plugin loaded")

		this.modalEl.addClass("scanner-modal");
	}
	

	async onClose() {}
}
