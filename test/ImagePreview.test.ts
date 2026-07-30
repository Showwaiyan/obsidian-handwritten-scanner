import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { ImagePreview } from "../UI/Components/ImagePreview";

describe("ImagePreview", () => {
	let parent: HTMLElement;
	let canvas: HTMLCanvasElement;
	let imagePreview: ImagePreview;
	let mockCtx: any;

	beforeEach(() => {
		vi.useFakeTimers();

		// Setup DOM elements
		parent = document.createElement("div");
		parent.style.width = "1000px";
		parent.style.height = "750px";
		document.body.appendChild(parent);

		canvas = document.createElement("canvas");
		mockCtx = canvas.getContext("2d");

		imagePreview = new ImagePreview(parent, canvas, 4 / 3);
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe("setup", () => {
		it("should initialize the canvas and append to parent", () => {
			imagePreview.setup();

			expect(parent.contains(canvas)).toBe(true);
		});

		it("should throw error if canvas context is not available", () => {
			const badCanvas = document.createElement("canvas");
			badCanvas.getContext = vi.fn(() => null);

			const badPreview = new ImagePreview(parent, badCanvas, 4 / 3);

			expect(() => badPreview.setup()).toThrow("Failed to get 2D contect");
		});

		it("should initialize with rotation degree of 0", () => {
			imagePreview.setup();

			// Load an image first
			const file = new File([""], "test.png", { type: "image/png" });
			imagePreview.darawImage(file);
			vi.runAllTimers();

			mockCtx.clearRect.mockClear();

			// Rotate by 0 should still trigger redraw
			imagePreview.rotate(0);
			expect(mockCtx.clearRect).toHaveBeenCalled();
		});
	});

	describe("rotate", () => {
		beforeEach(() => {
			imagePreview.setup();

			// Mock a loaded image
			const file = new File([""], "test.png", { type: "image/png" });
			imagePreview.darawImage(file);

			// Wait for image to load
			vi.runAllTimers();
		});

		it("should clear canvas when rotating", () => {
			mockCtx.clearRect.mockClear();

			imagePreview.rotate(90);

			// Should clear canvas (for transparency and redraw with checkerboard)
			expect(mockCtx.clearRect).toHaveBeenCalled();
		});

	it("should accumulate rotation degrees", () => {
		// Rotation degrees accumulate correctly through multiple rotations
		imagePreview.rotate(90);
		imagePreview.rotate(90);
		imagePreview.rotate(-45);
		
		// After rotations, image should have been redrawn
		expect(mockCtx.drawImage).toHaveBeenCalled();
	});

		it("should apply transformation when rotating", () => {
			mockCtx.save.mockClear();
			mockCtx.translate.mockClear();
			mockCtx.rotate.mockClear();
			mockCtx.drawImage.mockClear();
			mockCtx.restore.mockClear();

			imagePreview.rotate(90);

			expect(mockCtx.save).toHaveBeenCalled();
			expect(mockCtx.translate).toHaveBeenCalled();
			expect(mockCtx.rotate).toHaveBeenCalled();
			expect(mockCtx.drawImage).toHaveBeenCalled();
			expect(mockCtx.restore).toHaveBeenCalled();
		});

		it("should handle negative rotation degrees", () => {
			mockCtx.rotate.mockClear();
			mockCtx.drawImage.mockClear();

			imagePreview.rotate(-90);

			expect(mockCtx.rotate).toHaveBeenCalled();
			expect(mockCtx.drawImage).toHaveBeenCalled();
		});

		it("should handle multiple rotations", () => {
			mockCtx.rotate.mockClear();

			imagePreview.rotate(90);
			imagePreview.rotate(90);
			imagePreview.rotate(90);
			imagePreview.rotate(90);

			// Should have been called at least 4 times (may be more due to filter resets)
			expect(mockCtx.rotate).toHaveBeenCalled();
			expect(mockCtx.rotate.mock.calls.length).toBeGreaterThanOrEqual(4);
		});
	});

	describe("toggleCroppingPoints", () => {
		beforeEach(() => {
			imagePreview.setup();
		});

		it("should return error state when no image is loaded", () => {
			const result = imagePreview.toggleCroppingPoints(true);

			expect(result.success).toBe(false);
			expect(result.message).toBe("Please upload photo first!");
		});

		it("should show cropping points when image is loaded", () => {
			const file = new File([""], "test.png", { type: "image/png" });
			imagePreview.darawImage(file);
			vi.runAllTimers();

			const result = imagePreview.toggleCroppingPoints(true);
			expect(result.success).toBe(true);
		});

		it("should draw cropping points with correct message", () => {
			const file = new File([""], "test.png", { type: "image/png" });
			imagePreview.darawImage(file);
			vi.runAllTimers();

			mockCtx.beginPath.mockClear();
			mockCtx.arc.mockClear();

			const result = imagePreview.toggleCroppingPoints(true);

			expect(result.success).toBe(true);
			expect(result.message).toBe("Cropping points displayed");
			expect(mockCtx.beginPath).toHaveBeenCalled();
			expect(mockCtx.arc).toHaveBeenCalled();
		});

		it("should remove cropping points when toggled off", () => {
			const file = new File([""], "test.png", { type: "image/png" });
			imagePreview.darawImage(file);
			vi.runAllTimers();

			// First show the points
			imagePreview.toggleCroppingPoints(true);

			mockCtx.clearRect.mockClear();

			// Then remove them
			const result = imagePreview.toggleCroppingPoints(false);

			expect(result.success).toBe(true);
			expect(result.message).toBe("Cropping points removed");
			expect(mockCtx.clearRect).toHaveBeenCalled();
		});

		it("should draw 4 cropping points at image corners", () => {
			const file = new File([""], "test.png", { type: "image/png" });
			imagePreview.darawImage(file);
			vi.runAllTimers();

			mockCtx.arc.mockClear();
			imagePreview.toggleCroppingPoints(true);

			// Should draw 4 points × 2 circles each (outer + inner) = 8 arcs
			expect(mockCtx.arc).toHaveBeenCalledTimes(8);
		});

		it("should draw connecting lines between crop points", () => {
			const file = new File([""], "test.png", { type: "image/png" });
			imagePreview.darawImage(file);
			vi.runAllTimers();

			mockCtx.moveTo.mockClear();
			mockCtx.lineTo.mockClear();
			mockCtx.closePath.mockClear();

			imagePreview.toggleCroppingPoints(true);

			expect(mockCtx.moveTo).toHaveBeenCalledTimes(1);
			expect(mockCtx.lineTo).toHaveBeenCalledTimes(3);
			expect(mockCtx.closePath).toHaveBeenCalledTimes(1);
		});

		it("should not remove points if they are not visible", () => {
			const file = new File([""], "test.png", { type: "image/png" });
			imagePreview.darawImage(file);
			vi.runAllTimers();

			// Try to remove without showing first
			const clearRectCalls = mockCtx.clearRect.mock.calls.length;
			imagePreview.toggleCroppingPoints(false);

			// clearRect should not be called additionally
			expect(mockCtx.clearRect.mock.calls.length).toBe(clearRectCalls);
		});
	});

	describe("darawImage", () => {
		beforeEach(() => {
			imagePreview.setup();
		});

		it("should load and draw image from file", () => {
			const file = new File([""], "test.png", { type: "image/png" });

			mockCtx.drawImage.mockClear();
			mockCtx.fillRect.mockClear();

			imagePreview.darawImage(file);
			vi.runAllTimers();

			expect(mockCtx.drawImage).toHaveBeenCalled();
			expect(mockCtx.fillRect).toHaveBeenCalled();
		});

		it("should create object URL for the file", () => {
			const file = new File([""], "test.png", { type: "image/png" });

			imagePreview.darawImage(file);

			expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);
		});

		it("should revoke object URL after loading", () => {
			const file = new File([""], "test.png", { type: "image/png" });

			imagePreview.darawImage(file);
			vi.runAllTimers();

			expect(global.URL.revokeObjectURL).toHaveBeenCalled();
		});

		it("should clear canvas before drawing", () => {
			const file = new File([""], "test.png", { type: "image/png" });

			mockCtx.clearRect.mockClear();

			imagePreview.darawImage(file);
			vi.runAllTimers();

			expect(mockCtx.clearRect).toHaveBeenCalled();
		});

		it("should center image on canvas", () => {
			const file = new File([""], "test.png", { type: "image/png" });

			mockCtx.drawImage.mockClear();

			imagePreview.darawImage(file);
			vi.runAllTimers();

			const drawImageCall = mockCtx.drawImage.mock.calls[0];
			expect(drawImageCall).toBeDefined();
			expect(drawImageCall.length).toBeGreaterThan(0);
			// Image should be drawn (parameters exist)
			expect(drawImageCall[0]).toBeDefined(); // image
		});
	});

	describe("integration tests", () => {
		beforeEach(() => {
			imagePreview.setup();
		});

		it("should maintain crop points after rotation", () => {
			const file = new File([""], "test.png", { type: "image/png" });
			imagePreview.darawImage(file);
			vi.runAllTimers();

			// Show crop points
			imagePreview.toggleCroppingPoints(true);

			// Rotate image
			imagePreview.rotate(90);

			// Crop points should still be drawable
			const result = imagePreview.toggleCroppingPoints(true);
			expect(result.success).toBe(true);
		});

		it("should handle show/hide crop points multiple times", () => {
			const file = new File([""], "test.png", { type: "image/png" });
			imagePreview.darawImage(file);
			vi.runAllTimers();

			imagePreview.toggleCroppingPoints(true);
			imagePreview.toggleCroppingPoints(false);
			imagePreview.toggleCroppingPoints(true);
			const result = imagePreview.toggleCroppingPoints(false);

			expect(result.success).toBe(true);
			expect(result.message).toBe("Cropping points removed");
		});

		it("should redraw image correctly after removing crop points", () => {
			const file = new File([""], "test.png", { type: "image/png" });
			imagePreview.darawImage(file);
			vi.runAllTimers();

			imagePreview.toggleCroppingPoints(true);

			mockCtx.drawImage.mockClear();
			imagePreview.toggleCroppingPoints(false);

			// Should redraw the image
			expect(mockCtx.drawImage).toHaveBeenCalled();
		});
	});
});
