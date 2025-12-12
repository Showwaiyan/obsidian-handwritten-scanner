import { App, Modal, Notice } from "obsidian";

export class ScannerModal extends Modal {
	stream: MediaStream;
	videoElement: HTMLElement;

	constructor(app: App, onSubmit: (result: string) => void) {
		super(app);
		this.setTitle("Scan Your Note");
	}

}
