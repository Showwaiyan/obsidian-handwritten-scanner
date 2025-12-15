export function uploadImageToCanvas(drawImageOnCanvas: (file: File) => void) {
	const input: HTMLInputElement = document.createElement("input");
	input.type = "file";
	input.accept = "image/*";
	input.capture = "camera";

	input.onchange = (e: Event) => {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) throw new Error("Please select one and only file to upload");
		drawImageOnCanvas(file);
	};
	input.click();
}
