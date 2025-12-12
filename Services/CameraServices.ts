export class Camera {
	parentEl: HTMLElement;
	stream: MediaStream;
	videoElement: HTMLElement;

	constructor(parentEl: HTMLElement) {
		this.parentEl = parentEl;
		this.videoElement = this.parentEl.createEl("video");
	}

	async attachCamera() {
		this.stream = await navigator.mediaDevices.getUserMedia({
			video: true,
			audio: false,
		});
	}

	detachCamera() {
		if (!this.stream) return;
		const tracks = this.stream.getTracks();
		tracks.forEach((track) => {
			track.stop();
		});
	}
}
