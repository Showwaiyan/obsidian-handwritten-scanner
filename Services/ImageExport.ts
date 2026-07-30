/**
 * Image export utilities for PNG and SVG formats
 * Pure functions with no Obsidian API dependencies
 */

export type ExportFormat = "png" | "jpg" | "svg";

/**
 * Parse a hex color string to {r, g, b}
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const match = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
	if (!match) return { r: 0, g: 0, b: 0 };
	return {
		r: parseInt(match[1], 16),
		g: parseInt(match[2], 16),
		b: parseInt(match[3], 16),
	};
}

/**
 * Generate default filename with timestamp
 * @param prefix - Filename prefix (default: "scan")
 * @returns Filename like "scan-2026-01-12-095123"
 */
export function generateDefaultFilename(prefix: string = "scan"): string {
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	const seconds = String(now.getSeconds()).padStart(2, "0");

	return `${prefix}-${year}-${month}-${day}-${hours}${minutes}${seconds}`;
}

/**
 * Validate filename for filesystem compatibility
 * Rejects: empty, /, \, :, *, ?, <, >, |, "
 * @param filename - Filename to validate (without extension)
 * @returns Validation result with message
 */
export function validateFilename(
	filename: string,
): { valid: boolean; message: string } {
	if (!filename || filename.trim() === "") {
		return { valid: false, message: "Filename cannot be empty" };
	}

	const invalidChars = /[/\\:*?"<>|]/;
	if (invalidChars.test(filename)) {
		const matches = filename.match(invalidChars);
		const char = matches ? matches[0] : "";
		return {
			valid: false,
			message: `Filename contains invalid character: ${char}`,
		};
	}

	return { valid: true, message: "" };
}

/**
 * Export canvas to JPG blob
 * @param canvas - Canvas element to export
 * @param quality - JPEG quality (0.0 to 1.0, default 0.92)
 * @returns JPG blob
 */
export function exportCanvasToJPG(
	canvas: HTMLCanvasElement,
	quality: number = 0.92,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error("Failed to create JPG blob"));
				}
			},
			"image/jpeg",
			quality,
		);
	});
}

/**
 * Export canvas to PNG blob with transparent background
 * @param canvas - Canvas element to export
 * @returns PNG blob with maximum quality
 */
export function exportCanvasToPNG(
	canvas: HTMLCanvasElement,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) {
					resolve(blob);
				} else {
					reject(new Error("Failed to create PNG blob"));
				}
			},
			"image/png",
			1.0, // Maximum quality
		);
	});
}

/**
 * Tint canvas image by recoloring dark/ink areas to the chosen color.
 * Preserves transparency — only opaque pixels are recolored.
 * Lighter pixels stay light, darker pixels become the tint color.
 * @param canvas - Source canvas
 * @param tintColor - Hex color string (e.g. "#ff0000")
 * @returns New canvas with tint applied
 */
export function tintCanvasImage(
	canvas: HTMLCanvasElement,
	tintColor: string,
): HTMLCanvasElement {
	const tempCanvas = document.createElement("canvas");
	tempCanvas.width = canvas.width;
	tempCanvas.height = canvas.height;

	const ctx = tempCanvas.getContext("2d")!;
	ctx.drawImage(canvas, 0, 0);

	const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
	const data = imageData.data;

	const { r: tr, g: tg, b: tb } = hexToRgb(tintColor);

	for (let i = 0; i < data.length; i += 4) {
		const r = data[i];
		const g = data[i + 1];
		const b = data[i + 2];
		const a = data[i + 3];

		if (a === 0) continue;

		// How dark is this pixel (0 = white, 1 = black)
		const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
		const inkStrength = 1 - luminance / 255;

		// Lerp between white and tint color by ink strength
		data[i] = Math.round(255 * (1 - inkStrength) + tr * inkStrength);
		data[i + 1] = Math.round(255 * (1 - inkStrength) + tg * inkStrength);
		data[i + 2] = Math.round(255 * (1 - inkStrength) + tb * inkStrength);
	}

	ctx.putImageData(imageData, 0, 0);
	return tempCanvas;
}

/**
 * Export canvas to SVG blob (PNG embedded in SVG wrapper)
 * @param canvas - Canvas element to export
 * @param tintColor - Optional hex color to tint the image before export
 * @returns SVG blob with embedded PNG
 */
export function exportCanvasToSVG(
	canvas: HTMLCanvasElement,
	tintColor?: string,
): Blob {
	// Apply tint if specified
	const exportCanvas = tintColor
		? tintCanvasImage(canvas, tintColor)
		: canvas;

	// Convert canvas to PNG data URL
	const pngDataURL = exportCanvas.toDataURL("image/png", 1.0);

	// Create SVG with embedded PNG
	const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" 
     width="${exportCanvas.width}" 
     height="${exportCanvas.height}"
     viewBox="0 0 ${exportCanvas.width} ${exportCanvas.height}">
  <image href="${pngDataURL}" 
         width="${exportCanvas.width}" 
         height="${exportCanvas.height}"/>
</svg>`;

	return new Blob([svg], { type: "image/svg+xml" });
}

/**
 * Convert blob to ArrayBuffer for vault.createBinary()
 * @param blob - Blob to convert
 * @returns ArrayBuffer
 */
export async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
	return await blob.arrayBuffer();
}

/**
 * Get file extension for export format
 * @param format - "png", "jpg", or "svg"
 * @returns File extension with dot (e.g., ".png")
 */
export function getFileExtension(format: ExportFormat): string {
	if (format === "png") return ".png";
	if (format === "jpg") return ".jpg";
	return ".svg";
}
