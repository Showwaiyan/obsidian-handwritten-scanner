import { App, Modal, Notice } from "obsidian";
import { Camera } from "Services/CameraServices";

export class ScannerModal extends Modal {
	camera: Camera;

	constructor(app: App) {
		super(app);
		this.setTitle("Scan Your Note");
		this.camera = new Camera(this.contentEl);
	}

	async onOpen() {
		// Create video element
		// Get User Media
		try {
			this.camera.attachCamera();
		} catch (error) {
			new Notice(`Something Went Wrong.\nError: ${error.message}`);
			return;
		}
		// Get the Stream
		// Set video srcObject to that media
	}

	async onClose() {
		// Close steam's each track
		this.camera.detachCamera();
		this.close();
	}
}
