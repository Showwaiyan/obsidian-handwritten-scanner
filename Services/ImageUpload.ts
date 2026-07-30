export function uploadImageToCanvas(drawImageOnCanvas: (file: File) => void) {
	const doc = typeof activeDocument !== "undefined" ? activeDocument : document;
	const input = doc.createElement("input");
	input.type = "file";
	input.accept = "image/*";
	// Remove capture="camera" to allow both camera and photo library on mobile

	input.onchange = (e: Event) => {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;
		drawImageOnCanvas(file);
		input.value = "";
	};
	input.click();
}
