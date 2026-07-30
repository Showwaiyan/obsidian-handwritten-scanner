import { describe, it, expect } from "vitest";
import { detectPageCorners } from "../Services/PageDetection";

/**
 * Creates a synthetic ImageData: a white "page" rectangle on a
 * dark, slightly saturated "background" — mimics a sheet of paper
 * on a desk.
 */
function createTestImage(
	width: number,
	height: number,
	page: { x: number; y: number; w: number; h: number }
): ImageData {
	const data = new Uint8ClampedArray(width * height * 4);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = (y * width + x) * 4;
			const inPage = x >= page.x && x < page.x + page.w && y >= page.y && y < page.y + page.h;

			if (inPage) {
				// near-white, low saturation
				data[idx] = 245;
				data[idx + 1] = 245;
				data[idx + 2] = 245;
			} else {
				// dark, saturated "desk" background
				data[idx] = 60;
				data[idx + 1] = 40;
				data[idx + 2] = 80;
			}
			data[idx + 3] = 255;
		}
	}

	// Minimal ImageData-like object (happy-dom may already provide ImageData)
	return { data, width, height, colorSpace: "srgb" } as ImageData;
}

describe("detectPageCorners", () => {
	it("detects a clear rectangular page on a contrasting background", () => {
		const width = 400;
		const height = 600;
		const page = { x: 50, y: 80, w: 300, h: 440 };

		const imageData = createTestImage(width, height, page);
		const result = detectPageCorners(imageData);

		expect(result).not.toBeNull();
		if (!result) return;

		expect(result).toHaveLength(4);

		// Each detected corner should be reasonably close to the
		// expected rectangle corner (allow tolerance for downscale/approx error)
		// Detection returns [TL, TR, BL, BR]
		const expected = [
			{ x: page.x, y: page.y }, // TL
			{ x: page.x + page.w, y: page.y }, // TR
			{ x: page.x, y: page.y + page.h }, // BL
			{ x: page.x + page.w, y: page.y + page.h }, // BR
		];

		const tolerance = 25; // pixels
		for (let i = 0; i < 4; i++) {
			const d = Math.hypot(result[i].x - expected[i].x, result[i].y - expected[i].y);
			expect(d).toBeLessThan(tolerance);
		}
	});

	it("returns null for a featureless solid-color image", () => {
		const width = 200;
		const height = 200;
		const data = new Uint8ClampedArray(width * height * 4).fill(128);
		for (let i = 3; i < data.length; i += 4) data[i] = 255; // alpha

		const imageData = { data, width, height, colorSpace: "srgb" } as ImageData;
		const result = detectPageCorners(imageData);

		expect(result).toBeNull();
	});
});
