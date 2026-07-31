// @ts-ignore - No type definitions available for perspective-transform
import PerspT from "perspective-transform";
import { CropPoint, ImageDimensions, OperationResult } from "./types";
import { orderCropPoints, calculateOutputDimensions } from "./CropPointManager";

/**
 * Perform perspective crop transformation on canvas image data
 * Transforms the quadrilateral defined by crop points into a rectangle
 * @param sourceImageData - Source image data from canvas
 * @param sourceWidth - Width of source canvas (accounting for DPR)
 * @param sourceHeight - Height of source canvas (accounting for DPR)
 * @param cropPoints - Array of 4 crop points defining the quadrilateral
 * @param dpr - Device pixel ratio
 * @returns Object with success status, message, and transformed image data
 */
export function performPerspectiveCrop(
	sourceImageData: ImageData,
	sourceWidth: number,
	sourceHeight: number,
	cropPoints: CropPoint[],
	dpr: number = 1,
): OperationResult & { imageData?: ImageData; dimensions?: ImageDimensions } {
	try {
		// Validate crop points exist
		if (!cropPoints || cropPoints.length !== 4) {
			return {
				success: false,
				message: "Need exactly 4 crop points. Please show crop points first.",
			};
		}

		// Get ordered crop points (TL, TR, BL, BR)
		const orderedPoints = orderCropPoints(cropPoints);

		// Calculate output dimensions
		const dimensions = calculateOutputDimensions(cropPoints, dpr);

		// Validate dimensions
		if (dimensions.width < 50 || dimensions.height < 50) {
			return {
				success: false,
				message: "Crop area too small. Minimum dimensions: 50x50 pixels.",
			};
		}

		if (dimensions.width > 5000 || dimensions.height > 5000) {
			return {
				success: false,
				message: "Crop area too large. Maximum dimensions: 5000x5000 pixels.",
			};
		}

		// Create source coordinates (current crop point positions)
		const srcPoints = [
			orderedPoints[0].x, orderedPoints[0].y, // Top-left
			orderedPoints[1].x, orderedPoints[1].y, // Top-right
			orderedPoints[2].x, orderedPoints[2].y, // Bottom-left
			orderedPoints[3].x, orderedPoints[3].y, // Bottom-right
		];

		// Create destination coordinates (corners of output rectangle)
		const dstPoints = [
			0, 0,                        // Top-left
			dimensions.width, 0,         // Top-right
			0, dimensions.height,        // Bottom-left
			dimensions.width, dimensions.height,  // Bottom-right
		];

		// Create perspective transform
		type PerspTransformFn = (
			src: number[],
			dst: number[],
		) => { transformInverse: (x: number, y: number) => [number, number] };
		const createPerspT = PerspT as unknown as PerspTransformFn;
		const perspT = createPerspT(srcPoints, dstPoints);

		// Create output image data
		const outputImageData = new ImageData(dimensions.width, dimensions.height);

		// Apply perspective transformation pixel by pixel
		for (let y = 0; y < dimensions.height; y++) {
			for (let x = 0; x < dimensions.width; x++) {
				// Transform destination coordinates to source coordinates
				const srcCoords = perspT.transformInverse(x, y);
				
				// Scale coordinates by DPR to match the actual canvas dimensions
				const srcX = Math.round(srcCoords[0] * dpr);
				const srcY = Math.round(srcCoords[1] * dpr);

				// Check if source coordinates are within bounds
				if (srcX >= 0 && srcX < sourceWidth && srcY >= 0 && srcY < sourceHeight) {
					// Copy pixel from source to destination
					const srcIdx = (srcY * sourceWidth + srcX) * 4;
					const dstIdx = (y * dimensions.width + x) * 4;

					outputImageData.data[dstIdx] = sourceImageData.data[srcIdx];         // R
					outputImageData.data[dstIdx + 1] = sourceImageData.data[srcIdx + 1]; // G
					outputImageData.data[dstIdx + 2] = sourceImageData.data[srcIdx + 2]; // B
					outputImageData.data[dstIdx + 3] = sourceImageData.data[srcIdx + 3]; // A
				} else {
					// Outside bounds - set to transparent/black
					const dstIdx = (y * dimensions.width + x) * 4;
					outputImageData.data[dstIdx + 3] = 0; // Transparent
				}
			}
		}

		return {
			success: true,
			message: "Perspective crop applied successfully",
			imageData: outputImageData,
			dimensions,
		};

	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		console.error("Error during perspective crop:", error);
		return {
			success: false,
			message: `Crop failed: ${msg}`,
		};
	}
}

/**
 * Create an HTMLImageElement from ImageData
 * Handles DPR correctly by using ImageData's actual dimensions
 * @param imageData - Image data to convert
 * @param width - Desired output width (optional, uses imageData.width if not provided)
 * @param height - Desired output height (optional, uses imageData.height if not provided)
 * @returns Promise that resolves to the created image
 */
export function createImageFromImageData(
	imageData: ImageData,
	width?: number,
	height?: number,
): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		// Create temporary canvas matching ImageData dimensions (handles DPR correctly)
		const tempCanvas = createEl("canvas");
		tempCanvas.width = width ?? imageData.width;
		tempCanvas.height = height ?? imageData.height;
		const tempCtx = tempCanvas.getContext("2d");

		if (!tempCtx) {
			reject(new Error("Failed to create temporary canvas context."));
			return;
		}

		// Put the transformed image data onto the temporary canvas
		tempCtx.putImageData(imageData, 0, 0);

		// Create a new image from the result
		const image = new Image();
		image.onload = () => {
			resolve(image);
		};
		image.onerror = () => {
			reject(new Error("Failed to load image from canvas"));
		};

		image.src = tempCanvas.toDataURL();
	});
}

/**
 * Draw an image on canvas with optional rotation
 * @param ctx - Canvas rendering context
 * @param image - Image to draw
 * @param canvasWidth - Canvas width (CSS pixels)
 * @param canvasHeight - Canvas height (CSS pixels)
 * @param rotation - Rotation angle in degrees (0, 90, 180, 270)
 */
export function drawImageWithRotation(
	ctx: CanvasRenderingContext2D,
	image: HTMLImageElement,
	canvasWidth: number,
	canvasHeight: number,
	rotation: number = 0,
): void {
	// Note: Canvas should already have background (e.g., checkerboard) drawn by caller
	// Do not clear here to preserve the background pattern for transparency visibility
	
	// Normalize rotation
	const normalizedRotation = ((rotation % 360) + 360) % 360;
	
	// For 90° and 270°, we need to draw at swapped dimensions
	// before rotating, because the canvas is already resized
	const isRotated90or270 = normalizedRotation === 90 || normalizedRotation === 270;
	const drawWidth = isRotated90or270 ? canvasHeight : canvasWidth;
	const drawHeight = isRotated90or270 ? canvasWidth : canvasHeight;

	// Check if image needs rotation
	if (rotation !== 0) {
		// Redraw with rotation
		const rad = (rotation * Math.PI) / 180;

		// Rotate around center of canvas
		ctx.save();
		ctx.translate(canvasWidth / 2, canvasHeight / 2);
		ctx.rotate(rad);

		// Draw image centered with corrected dimensions
		ctx.drawImage(
			image,
			-drawWidth / 2,
			-drawHeight / 2,
			drawWidth,
			drawHeight,
		);

		ctx.restore();
	} else {
		// Redraw without rotation (fills entire canvas)
		ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);
	}
}

/**
 * Calculate canvas dimensions for an image with rotation
 * Swaps width/height for 90° and 270° rotations
 * @param imageWidth - Original image width
 * @param imageHeight - Original image height
 * @param rotation - Rotation angle in degrees
 * @returns Dimensions for the canvas
 */
export function calculateRotatedDimensions(
	imageWidth: number,
	imageHeight: number,
	rotation: number,
): ImageDimensions {
	// Normalize rotation to 0-360 range
	const normalizedRotation = ((rotation % 360) + 360) % 360;
	
	// If at 90° or 270°, swap dimensions (portrait ↔ landscape)
	if (normalizedRotation === 90 || normalizedRotation === 270) {
		return { width: imageHeight, height: imageWidth };
	}
	
	// 0° or 180°: use original dimensions
	return { width: imageWidth, height: imageHeight };
}
