import { CropPoint, CropPointStyle, PlaceholderConfig, MagnifierConfig } from "./types";

/**
 * Clear the entire canvas
 * @param ctx - Canvas rendering context
 * @param width - Canvas width (CSS pixels)
 * @param height - Canvas height (CSS pixels)
 */
export function clearCanvas(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
): void {
	ctx.clearRect(0, 0, width, height);
}

/**
 * Fill canvas with a solid color
 * @param ctx - Canvas rendering context
 * @param width - Canvas width (CSS pixels)
 * @param height - Canvas height (CSS pixels)
 * @param color - Fill color
 */
export function fillCanvas(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	color: string,
): void {
	ctx.fillStyle = color;
	ctx.fillRect(0, 0, width, height);
}

/**
 * Fill canvas with a checkerboard pattern (for transparent backgrounds)
 * @param ctx - Canvas rendering context
 * @param width - Canvas width (CSS pixels)
 * @param height - Canvas height (CSS pixels)
 * @param squareSize - Size of each checker square (default: 10)
 * @param color1 - First color (default: light gray)
 * @param color2 - Second color (default: white)
 */
export function fillCanvasWithCheckerboard(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	squareSize: number = 10,
	color1: string = "#e0e0e0",
	color2: string = "#ffffff",
): void {
	// Clear canvas first
	ctx.clearRect(0, 0, width, height);
	
	// Draw checkerboard pattern
	for (let y = 0; y < height; y += squareSize) {
		for (let x = 0; x < width; x += squareSize) {
			// Alternate colors in a checkerboard pattern
			const isEvenSquare = (Math.floor(x / squareSize) + Math.floor(y / squareSize)) % 2 === 0;
			ctx.fillStyle = isEvenSquare ? color1 : color2;
			ctx.fillRect(x, y, squareSize, squareSize);
		}
	}
}

/**
 * Render a placeholder with icon and text
 * @param ctx - Canvas rendering context
 * @param width - Canvas width (CSS pixels)
 * @param height - Canvas height (CSS pixels)
 * @param config - Placeholder configuration
 */
export function renderPlaceholder(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
	config: PlaceholderConfig,
): void {
	// Clear and fill background
	clearCanvas(ctx, width, height);
	fillCanvas(ctx, width, height, config.backgroundColor);

	const centerX = width / 2;
	const centerY = height / 2;

	// Draw icon (camera/image icon)
	const iconSize = Math.min(width, height) / 8;
	renderImageIcon(ctx, centerX, centerY - iconSize, iconSize, config.iconColor);

	// Draw placeholder text
	ctx.textAlign = "center";
	ctx.textBaseline = "top";

	// Primary text
	const primaryFontSize = Math.max(16, Math.min(width, height) / 20);
	ctx.font = `${primaryFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
	ctx.fillStyle = config.textColor;
	ctx.fillText(
		config.primaryText,
		centerX,
		centerY + iconSize / 2,
	);

	// Secondary text
	const secondaryFontSize = Math.max(12, Math.min(width, height) / 40);
	ctx.font = `${secondaryFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
	ctx.fillStyle = config.secondaryTextColor;
	ctx.fillText(
		config.secondaryText,
		centerX,
		centerY + iconSize / 2 + primaryFontSize * 1.5,
	);
}

/**
 * Render an image icon (camera/landscape symbol)
 * @param ctx - Canvas rendering context
 * @param x - Center X coordinate
 * @param y - Center Y coordinate
 * @param size - Icon size
 * @param color - Icon color
 */
export function renderImageIcon(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	color: string,
): void {
	ctx.save();
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	ctx.lineWidth = 2;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";

	// Draw image frame (rectangle)
	const frameSize = size;
	const frameX = x - frameSize / 2;
	const frameY = y - frameSize / 2;

	ctx.strokeRect(frameX, frameY, frameSize, frameSize);

	// Draw mountain/landscape icon inside
	ctx.beginPath();
	// Mountain peak
	ctx.moveTo(frameX + frameSize * 0.15, frameY + frameSize * 0.7);
	ctx.lineTo(frameX + frameSize * 0.4, frameY + frameSize * 0.4);
	ctx.lineTo(frameX + frameSize * 0.65, frameY + frameSize * 0.7);
	ctx.stroke();

	// Second smaller mountain
	ctx.beginPath();
	ctx.moveTo(frameX + frameSize * 0.5, frameY + frameSize * 0.7);
	ctx.lineTo(frameX + frameSize * 0.7, frameY + frameSize * 0.5);
	ctx.lineTo(frameX + frameSize * 0.9, frameY + frameSize * 0.7);
	ctx.stroke();

	// Sun/circle in top right
	ctx.beginPath();
	ctx.arc(
		frameX + frameSize * 0.75,
		frameY + frameSize * 0.25,
		frameSize * 0.1,
		0,
		Math.PI * 2,
	);
	ctx.fill();

	ctx.restore();
}

/**
 * Render crop points with connecting lines
 * @param ctx - Canvas rendering context
 * @param points - Array of crop points
 * @param style - Style configuration
 */
export function renderCropPoints(
	ctx: CanvasRenderingContext2D,
	points: CropPoint[],
	style: CropPointStyle,
): void {
	if (points.length !== 4) {
		return;
	}

	ctx.save();

	// Draw connecting lines between points
	ctx.beginPath();
	ctx.moveTo(points[0].x, points[0].y); // Top-left
	ctx.lineTo(points[1].x, points[1].y); // Top-right
	ctx.lineTo(points[3].x, points[3].y); // Bottom-right
	ctx.lineTo(points[2].x, points[2].y); // Bottom-left
	ctx.closePath();
	ctx.strokeStyle = style.lineColor;
	ctx.lineWidth = style.lineWidth;
	ctx.stroke();

	// Draw the crop points (all at full opacity)
	points.forEach((point) => {
		// Draw outer circle (white)
		ctx.beginPath();
		ctx.arc(point.x, point.y, style.outerRadius, 0, Math.PI * 2);
		ctx.fillStyle = style.outerColor;
		ctx.fill();
		ctx.strokeStyle = "#000000";
		ctx.lineWidth = 2;
		ctx.stroke();

		// Draw inner circle (colored)
		ctx.beginPath();
		ctx.arc(point.x, point.y, style.innerRadius, 0, Math.PI * 2);
		ctx.fillStyle = style.innerColor;
		ctx.fill();
	});

	ctx.restore();
}

/**
 * Render a magnifying loupe at the specified position
 * Shows a zoomed view of the area around the point being dragged
 * @param ctx - Canvas rendering context
 * @param pointX - X coordinate of the point being dragged
 * @param pointY - Y coordinate of the point being dragged
 * @param canvasWidth - Canvas width (CSS pixels)
 * @param canvasHeight - Canvas height (CSS pixels)
 * @param config - Magnifier configuration
 */
export function renderMagnifier(
	ctx: CanvasRenderingContext2D,
	pointX: number,
	pointY: number,
	canvasWidth: number,
	canvasHeight: number,
	config: MagnifierConfig,
): void {
	// Calculate magnifier position (smart positioning to avoid edges)
	let magnifierX = pointX;
	let magnifierY = pointY - config.offset;

	// Adjust if near top edge - position below instead
	if (magnifierY - config.radius < 0) {
		magnifierY = pointY + config.offset;
	}

	// Adjust if near left edge
	if (magnifierX - config.radius < 0) {
		magnifierX = config.radius + 10;
	}

	// Adjust if near right edge
	if (magnifierX + config.radius > canvasWidth) {
		magnifierX = canvasWidth - config.radius - 10;
	}

	// Adjust if near bottom edge
	if (magnifierY + config.radius > canvasHeight) {
		magnifierY = canvasHeight - config.radius - 10;
	}

	// Get DPR for sampling the canvas at correct resolution
	const dpr = window.devicePixelRatio || 1;

	// Calculate the source area to magnify (area around the dragged point)
	const sourceSize = (config.radius * 2) / config.zoom;
	const sourceX = pointX - sourceSize / 2;
	const sourceY = pointY - sourceSize / 2;

	// Sample from the current canvas state (which includes rotation, filters, etc.)
	const actualSourceX = Math.floor(sourceX * dpr);
	const actualSourceY = Math.floor(sourceY * dpr);
	const actualSourceSize = Math.floor(sourceSize * dpr);

	// Get the image data from the current canvas state
	const canvasImageData = ctx.getImageData(
		actualSourceX,
		actualSourceY,
		actualSourceSize,
		actualSourceSize
	);

	// Create temporary canvas for magnified content
	const tempCanvas = createEl("canvas");
	const destSize = config.radius * 2;
	tempCanvas.width = destSize;
	tempCanvas.height = destSize;
	const tempCtx = tempCanvas.getContext("2d");

	if (!tempCtx) {
		return;
	}

	// Create a temporary canvas to hold the sampled image data at original size
	const sampleCanvas = createEl("canvas");
	sampleCanvas.width = actualSourceSize;
	sampleCanvas.height = actualSourceSize;
	const sampleCtx = sampleCanvas.getContext("2d");

	if (!sampleCtx) {
		return;
	}

	// Put the sampled image data onto the sample canvas
	sampleCtx.putImageData(canvasImageData, 0, 0);

	// Draw the sampled content scaled up (magnified) onto temp canvas
	tempCtx.drawImage(sampleCanvas, 0, 0, actualSourceSize, actualSourceSize, 0, 0, destSize, destSize);

	// Save context state
	ctx.save();

	// Create circular clipping path for magnifier
	ctx.beginPath();
	ctx.arc(magnifierX, magnifierY, config.radius, 0, Math.PI * 2);
	ctx.clip();

	// Draw the magnified content onto main canvas
	const destX = magnifierX - config.radius;
	const destY = magnifierY - config.radius;
	ctx.drawImage(tempCanvas, destX, destY, destSize, destSize);

	// Restore context (removes clipping)
	ctx.restore();

	// Draw magnifier border and styling
	ctx.save();

	// Outer shadow for depth
	ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
	ctx.shadowBlur = 10;
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 2;

	// Draw white border
	ctx.beginPath();
	ctx.arc(magnifierX, magnifierY, config.radius, 0, Math.PI * 2);
	ctx.strokeStyle = "#ffffff";
	ctx.lineWidth = 4;
	ctx.stroke();

	// Draw black outer ring
	ctx.shadowColor = "transparent";
	ctx.beginPath();
	ctx.arc(magnifierX, magnifierY, config.radius + 2, 0, Math.PI * 2);
	ctx.strokeStyle = "#000000";
	ctx.lineWidth = 2;
	ctx.stroke();

	// Draw crosshair at center to show exact position
	ctx.strokeStyle = "#00ff00";
	ctx.lineWidth = 1.5;
	ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
	ctx.shadowBlur = 2;

	// Horizontal line
	ctx.beginPath();
	ctx.moveTo(magnifierX - 12, magnifierY);
	ctx.lineTo(magnifierX + 12, magnifierY);
	ctx.stroke();

	// Vertical line
	ctx.beginPath();
	ctx.moveTo(magnifierX, magnifierY - 12);
	ctx.lineTo(magnifierX, magnifierY + 12);
	ctx.stroke();

	ctx.restore();
}
