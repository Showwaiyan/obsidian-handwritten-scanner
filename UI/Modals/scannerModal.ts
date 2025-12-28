import { App, ButtonComponent, Modal, Notice } from "obsidian";
import { uploadImageToCanvas } from "Services/ImageUpload";
import { ImagePreview } from "UI/Components/ImagePreview";

export class ScannerModal extends Modal {
	private container: HTMLElement;
	private buttonWrapper: HTMLElement;
	private canvas: ImagePreview;
	private btnPhotoUpload: ButtonComponent;
	private btnPhotoRotateCW: ButtonComponent;
	private btnPhotoRotateACW: ButtonComponent;

	constructor(app: App) {
		super(app);
		this.setTitle("Scan Your Note");
		this.modalEl.addClass("scanner-modal");

		this.container = this.contentEl.createDiv("scanner-modal-container");
		this.canvas = new ImagePreview(
			this.container,
			this.container.createEl("canvas"),
			4 / 3,
		);

		this.buttonWrapper = this.contentEl.createDiv("button-wrapper");
	}

	async onOpen() {
		try {
			this.canvas.setup();
		} catch (error) {
			console.log(`Error: ${error.message}`);
			new Notice(
				"Cannot Create Image Preview Canvas\nPlease review details in Console",
			);
		}

		//btn setup
		this.btnPhotoUpload = new ButtonComponent(this.buttonWrapper)
			.setIcon("image")
			.setTooltip("Upload image from gallery")
			.setCta()
			.onClick(() =>
				uploadImageToCanvas(this.canvas.darawImage.bind(this.canvas)),
			);

		this.btnPhotoRotateCW = new ButtonComponent(this.buttonWrapper)
			.setIcon("rotate-cw")
			.setTooltip("Rotate image 90° clockwise")
			.onClick(() => this.canvas.rotate(90));
		this.btnPhotoRotateACW = new ButtonComponent(this.buttonWrapper)
			.setIcon("rotate-ccw")
			.setTooltip("Rotate image 90° counter-clockwise")
			.onClick(() => this.canvas.rotate(-90));
	}

	async onClose() {}
}
