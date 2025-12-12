export class Camera {
	parentEl: HTMLElement;
	stream: MediaStream;
	videoElement: HTMLVideoElement;

	constructor(parentEl: HTMLElement) {
		this.parentEl = parentEl;
		this.videoElement = this.parentEl.createEl("video");
	}

	async attachCamera() {
		this.stream = await navigator.mediaDevices.getUserMedia({
			video: true,
			audio: false,
		});
		this.videoElement.srcObject = this.stream;
		try {
			await this.videoElement.play();
		} catch (error) {
			// Ignore play interruption errors (DOMException)
			if (error.name !== 'AbortError') {
				throw error;
			}
		}
	}

	detachCamera() {
		if (!this.stream) return;
		// Pause video and clear srcObject
		this.videoElement.pause();
		this.videoElement.srcObject = null;
		// Stop all media tracks
		const tracks = this.stream.getTracks();
		tracks.forEach((track) => {
			track.stop();
		});
	}
}
