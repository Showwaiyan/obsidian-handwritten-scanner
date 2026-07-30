import { findCropPointAtPosition } from "Services/Interaction";
import {
	initializeCropPoints,
	updateCropPoint,
	setCropPointDragging,
	validateCropPoints,
} from "Services/CropPointManager";
import {
	performPerspectiveCrop,
	createImageFromImageData,
	drawImageWithRotation,
	calculateRotatedDimensions,
} from "Services/ImageTransform";
import {
	fillCanvasWithCheckerboard,
	renderPlaceholder,
	renderCropPoints,
	renderMagnifier,
} from "Services/CanvasRenderer";
import {
	DEFAULT_FILTER_CONFIG,
	applyFilters,
} from "Services/ImageFilter";
import {
	sampleColorAtPoint,
	removeBackground,
	type RGB,
} from "Services/ImageBackgroundRemoval";
import {
	CropPoint,
	CropPointStyle,
	PlaceholderConfig,
	MagnifierConfig,
	OperationResult,
	ImageFilterConfig,
} from "Services/types";

export class ImagePreview {
	private parent: HTMLElement;
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private ratio: number;
	private img: HTMLImageElement;

	// Store image position and dimensions for future reference
	private imgX: number;
	private imgY: number;
	private imgWidth: number;
	private imgHeight: number;

	// for continuous rotation
	private toRotateDegree: number;

	// for cropping points
	private croppingPointsVisible: boolean;
	private cropPoints: CropPoint[];
	private draggedPointIndex: number;

	// for image filters
	private filterConfig: ImageFilterConfig;
	private originalImageData: ImageData | null;
	private filterDebounceTimer: number | null;

	// for background removal
	private backgroundRemovalMode: boolean;
	private sampledBackgroundColor: RGB | null;
	private bgRemovalTolerance: number;
	private bgRemovalPreviewEnabled: boolean;
	private originalImageDataBeforeRemoval: ImageData | null;
	private onColorSampled: ((color: RGB) => void) | null;

	// Configuration
	private magnifierConfig: MagnifierConfig;
	private cropPointStyle: CropPointStyle;
	private placeholderConfig: PlaceholderConfig;

	constructor(
		parent: HTMLElement,
		element: HTMLCanvasElement,
		ratio: number,
	) {
		this.parent = parent;
		this.canvas = element;
		this.ratio = ratio;

		// Initialize configurations
		this.magnifierConfig = {
			radius: 60,
			zoom: 2.5,
			offset: 90,
		};

		this.cropPointStyle = {
			outerRadius: 12,
			innerRadius: 7,
			outerColor: "#ffffff",
			innerColor: "#3b82f6",
			lineColor: "#3b82f6",
			lineWidth: 2,
		};

		this.placeholderConfig = {
			primaryText: "Upload or take a picture",
			secondaryText: "to process your handwritten note",
			backgroundColor: "#f5f5f5",
			iconColor: "#888888",
			textColor: "#888888",
			secondaryTextColor: "#aaaaaa",
		};
	}

	public setup() {
		const ctx = this.canvas.getContext("2d");
		if (!ctx) throw new Error("Failed to get 2D contect");
		this.ctx = ctx;

		this.parent.appendChild(this.canvas);
		this.toRotateDegree = 0;
		this.croppingPointsVisible = false;
		this.cropPoints = [];
		this.draggedPointIndex = -1;
		this.filterConfig = { ...DEFAULT_FILTER_CONFIG };
		this.originalImageData = null;
		this.filterDebounceTimer = null;
		this.backgroundRemovalMode = false;
		this.sampledBackgroundColor = null;
		this.bgRemovalTolerance = 15;
		this.bgRemovalPreviewEnabled = true;
		this.originalImageDataBeforeRemoval = null;
		this.onColorSampled = null;

		// Setup input event handlers (mouse and touch)
		this.setupInputEvents();

		// Wait for next frame to ensure parent has dimensions
		requestAnimationFrame(() => {
			this.resize();
			this.initializePlaceholder();
		});
	}

	private setupInputEvents() {
		// Mouse events (desktop)
		this.canvas.addEventListener("mousedown", this.onMouseDown.bind(this));
		this.canvas.addEventListener("mousemove", this.onMouseMove.bind(this));
		this.canvas.addEventListener("mouseup", this.onMouseUp.bind(this));

		// Touch events (mobile)
		this.canvas.addEventListener("touchstart", this.onTouchStart.bind(this), { passive: false });
		this.canvas.addEventListener("touchmove", this.onTouchMove.bind(this), { passive: false });
		this.canvas.addEventListener("touchend", this.onTouchEnd.bind(this));
	}

	/**
	 * Get pointer position from mouse or touch event
	 * @param event - Mouse or Touch event
	 * @returns Position {x, y} relative to canvas, or null if invalid
	 */
	private getPointerPosition(event: MouseEvent | TouchEvent): { x: number; y: number } | null {
		const rect = this.canvas.getBoundingClientRect();
		
		// Get computed border width (canvas has 5px border in CSS)
		const computedStyle = window.getComputedStyle(this.canvas);
		const borderLeft = parseFloat(computedStyle.borderLeftWidth) || 0;
		const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
		
		let clientX: number;
		let clientY: number;

		if (event instanceof MouseEvent) {
			clientX = event.clientX;
			clientY = event.clientY;
		} else if (event instanceof TouchEvent && event.touches.length > 0) {
			clientX = event.touches[0].clientX;
			clientY = event.touches[0].clientY;
		} else {
			return null;
		}
		
		const x = clientX - rect.left - borderLeft;
		const y = clientY - rect.top - borderTop;

		return { x, y };
	}

	private onMouseDown(event: MouseEvent) {
		if (!this.croppingPointsVisible || this.cropPoints.length === 0) {
			return;
		}

		const pos = this.getPointerPosition(event);
		if (!pos) return;

		// Find which crop point (if any) was clicked (20px hit area)
		const clickedIndex = findCropPointAtPosition(pos.x, pos.y, this.cropPoints, 20);

		if (clickedIndex !== -1) {
		this.draggedPointIndex = clickedIndex;
		this.cropPoints = setCropPointDragging(this.cropPoints, clickedIndex, true);
		} else {
			this.draggedPointIndex = -1;
		}
	}

	private onMouseMove(event: MouseEvent) {
		if (this.draggedPointIndex === -1) {
			return;
		}

		const pos = this.getPointerPosition(event);
		if (!pos) return;

		// Update the dragged crop point's position
		this.cropPoints = updateCropPoint(this.cropPoints, this.draggedPointIndex, pos.x, pos.y);

		// Redraw the image only (no crop points yet)
		this.redrawImage();

		// Draw magnifier (samples clean canvas without crop points)
		this.renderMagnifierAtPoint(pos.x, pos.y);

		// Draw crop points on top (all at full opacity, outside magnifier)
		this.renderCroppingPointsOnCanvas();
	}

	private onMouseUp(event: MouseEvent) {
		if (this.draggedPointIndex === -1) {
			return;
		}

		// Reset dragging state for all points
		this.cropPoints = setCropPointDragging(this.cropPoints, -1, false);
		this.draggedPointIndex = -1;

		// Redraw without magnifier
		this.redrawCroppingPoints();
	}

	private onTouchStart(event: TouchEvent) {
		if (!this.croppingPointsVisible || this.cropPoints.length === 0) {
			return;
		}

		event.preventDefault();

		const pos = this.getPointerPosition(event);
		if (!pos) return;

		// Find which crop point (if any) was touched (30px hit area for touch)
		const clickedIndex = findCropPointAtPosition(pos.x, pos.y, this.cropPoints, 30);

		if (clickedIndex !== -1) {
		this.draggedPointIndex = clickedIndex;
		this.cropPoints = setCropPointDragging(this.cropPoints, clickedIndex, true);
		} else {
			this.draggedPointIndex = -1;
		}
	}

	private onTouchMove(event: TouchEvent) {
		if (this.draggedPointIndex === -1) {
			return;
		}

		event.preventDefault();

		const pos = this.getPointerPosition(event);
		if (!pos) return;

		// Update the dragged crop point's position
		this.cropPoints = updateCropPoint(this.cropPoints, this.draggedPointIndex, pos.x, pos.y);

		// Redraw the image only (no crop points yet)
		this.redrawImage();

		// Draw magnifier (samples clean canvas without crop points)
		this.renderMagnifierAtPoint(pos.x, pos.y);

		// Draw crop points on top (all at full opacity, outside magnifier)
		this.renderCroppingPointsOnCanvas();
	}

	private onTouchEnd(event: TouchEvent) {
		if (this.draggedPointIndex === -1) {
			return;
		}

		// Reset dragging state for all points
		this.cropPoints = setCropPointDragging(this.cropPoints, -1, false);
		this.draggedPointIndex = -1;

		// Redraw without magnifier
		this.redrawCroppingPoints();
	}

	private resize() {
		const parentWidth = this.parent.clientWidth;

		// Reduced divisor from 1.4 to 1.15 for larger canvas on all devices
		const width: number = parentWidth / 1.15;
		const height: number = width / this.ratio;

		/*
		How dpr works?
			It tells you
			How many physical device's pixel(how many px canvas actually use) is equal to
			css size's pixel(how big on screen) on screen
			2 px on physical device is equal to 1 px of css size
			So, it has dpr 2.
		*/
		const dpr: number = window.devicePixelRatio || 1;

		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;

		this.canvas.width = Math.floor(width * dpr);
		this.canvas.height = Math.floor(height * dpr);

		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	/**
	 * Resize canvas to match the uploaded image's aspect ratio
	 * This ensures maximum resolution usage with no letterboxing
	 * @param imageWidth - Width of the source image
	 * @param imageHeight - Height of the source image
	 */
	private resizeToImage(imageWidth: number, imageHeight: number) {
		const parentWidth = this.parent.clientWidth;
		const parentHeight = this.parent.clientHeight;
		
		// Calculate image aspect ratio
		const imageRatio = imageWidth / imageHeight;
		
		// Start with width-constrained size
		let canvasWidth = parentWidth / 1.15;
		let canvasHeight = canvasWidth / imageRatio;
		
		// Cap maximum height at 80% of parent to leave space for buttons
		const maxHeight = parentHeight * 0.8;
		if (canvasHeight > maxHeight) {
			canvasHeight = maxHeight;
			canvasWidth = canvasHeight * imageRatio;
		}
		
		// Apply DPR for sharp rendering
		const dpr: number = window.devicePixelRatio || 1;
		
		this.canvas.style.width = `${canvasWidth}px`;
		this.canvas.style.height = `${canvasHeight}px`;
		
		this.canvas.width = Math.floor(canvasWidth * dpr);
		this.canvas.height = Math.floor(canvasHeight * dpr);
		
		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}

	private initializePlaceholder() {
		const cssWidth = parseInt(this.canvas.style.width);
		const cssHeight = parseInt(this.canvas.style.height);
		const dpr = window.devicePixelRatio || 1;

		renderPlaceholder(this.ctx, cssWidth, cssHeight, this.placeholderConfig);
	}

	public darawImage(file: File) {
		// Clean up previous image if exists
		if (this.img) {
			if (this.img.src && this.img.src.startsWith('blob:')) {
				URL.revokeObjectURL(this.img.src);
			}
		}
		
		this.img = new Image();

		this.img.onload = () => {
			// Reset filters when loading new image (as per user preference Option A)
			this.filterConfig = { ...DEFAULT_FILTER_CONFIG };
			
			// Small delay for mobile to ensure DOM is ready
			setTimeout(() => {
				// Resize canvas to match image aspect ratio (eliminates letterboxing)
				this.resizeToImage(this.img.width, this.img.height);

				// Get NEW canvas dimensions after resize
				const cssWidth = parseInt(this.canvas.style.width);
				const cssHeight = parseInt(this.canvas.style.height);

				// Clear canvas and draw checkerboard pattern for transparency visibility
				fillCanvasWithCheckerboard(this.ctx, cssWidth, cssHeight);

				// Image fills entire canvas (no letterboxing, maximum resolution)
				this.imgX = 0;
				this.imgY = 0;
				this.imgWidth = cssWidth;
				this.imgHeight = cssHeight;

				// Draw image at full canvas size
				this.ctx.drawImage(this.img, 0, 0, cssWidth, cssHeight);

				URL.revokeObjectURL(this.img.src);
			}, 50);
		};
		
		this.img.onerror = () => {
			console.error("Failed to load image");
			URL.revokeObjectURL(this.img.src);
		};

		this.img.src = URL.createObjectURL(file);
	}

	private redrawImage() {
		const cssWidth = parseInt(this.canvas.style.width);
		const cssHeight = parseInt(this.canvas.style.height);

		// Draw checkerboard pattern first for transparency visibility
		fillCanvasWithCheckerboard(this.ctx, cssWidth, cssHeight);

		// Draw the rotated image
		drawImageWithRotation(
			this.ctx,
			this.img,
			cssWidth,
			cssHeight,
			this.toRotateDegree,
		);

		// Apply filters if any are active
		this.applyCurrentFilters();
	}

	public rotate(degree: number): OperationResult {
		// Check if image is loaded
		if (this.img == null) {
			return {
				success: false,
				message: "Please upload photo first!",
			};
	}
	
	// Clear crop points for safety (positions become invalid after rotation)
		this.removeCroppingPoints();
		
		// Reset filters when rotating (as per user preference Option A)
		this.resetFilters();
		
		// Update rotation degree
		this.toRotateDegree = this.toRotateDegree + degree;
		
		// Calculate new dimensions based on rotation
		const newDimensions = calculateRotatedDimensions(
			this.img.width,
			this.img.height,
			this.toRotateDegree,
		);
		
		// Resize canvas to match rotated dimensions
		this.resizeToImage(newDimensions.width, newDimensions.height);
		
		// Update image dimensions to match new canvas size
		const cssWidth = parseInt(this.canvas.style.width);
		const cssHeight = parseInt(this.canvas.style.height);
		this.imgWidth = cssWidth;
		this.imgHeight = cssHeight;
		
		// Redraw the image with new rotation
		this.redrawImage();
		
		return {
			success: true,
			message: "Image rotated successfully",
		};
	}

	private drawCroppingPoints(detectedPoints?: CropPoint[]) {
		// Use detected points if provided, otherwise initialize at corners
		if (detectedPoints && detectedPoints.length === 4) {
			this.cropPoints = detectedPoints;
		} else {
			this.cropPoints = initializeCropPoints({
				x: this.imgX,
				y: this.imgY,
				width: this.imgWidth,
				height: this.imgHeight,
			});
		}

		this.renderCroppingPointsOnCanvas();
		this.croppingPointsVisible = true;
	}

	private renderCroppingPointsOnCanvas() {
		renderCropPoints(this.ctx, this.cropPoints, this.cropPointStyle);
	}

	private redrawCroppingPoints() {
		// Redraw the image (this clears the old crop points)
		this.redrawImage();

		// Render crop points at their updated positions
		this.renderCroppingPointsOnCanvas();
	}

	private renderMagnifierAtPoint(pointX: number, pointY: number) {
		const cssWidth = parseInt(this.canvas.style.width);
		const cssHeight = parseInt(this.canvas.style.height);

		renderMagnifier(
			this.ctx,
			pointX,
			pointY,
			cssWidth,
			cssHeight,
			this.magnifierConfig,
		);
	}

	private removeCroppingPoints() {
		if (!this.croppingPointsVisible) return;

		// Redraw the image to remove the crop points
		this.redrawImage();

		this.cropPoints = [];
		this.croppingPointsVisible = false;
	}

	public toggleCroppingPoints(show: boolean, detectedPoints?: CropPoint[]): OperationResult {
		let state = false;
		let message = "";
		if (this.img == null) {
			state = false;
			message = "Please upload photo first!";
		} else {
			if (show) {
				this.drawCroppingPoints(detectedPoints);
				state = true;
				message = detectedPoints ? "Auto-detected corners displayed" : "Cropping points displayed";
			} else {
				this.removeCroppingPoints();
				state = true;
				message = "Cropping points removed";
			}
		}
		return { success: state, message };
	}

	/**
	 * Perform perspective crop transformation
	 * Transforms the quadrilateral defined by crop points into a rectangle
	 * @returns Object with success status and message
	 */
	public performPerspectiveCrop(): OperationResult {
		// Validate crop points exist
		if (!validateCropPoints(this.cropPoints)) {
			return {
				success: false,
				message: "Need exactly 4 valid crop points. Please show crop points first.",
			};
		}

		// Validate image exists
		if (!this.img) {
			return {
				success: false,
				message: "No image loaded. Please upload an image first.",
			};
		}

		// IMPORTANT: Redraw the image WITHOUT crop points before capturing
		this.redrawImage();

		// Get current canvas state as image data
		const cssWidth = parseInt(this.canvas.style.width);
		const cssHeight = parseInt(this.canvas.style.height);
		const dpr = window.devicePixelRatio || 1;
		
		const actualWidth = Math.floor(cssWidth * dpr);
		const actualHeight = Math.floor(cssHeight * dpr);
		
	const sourceImageData = this.ctx.getImageData(0, 0, actualWidth, actualHeight);

	// Perform the transformation
		const result = performPerspectiveCrop(
			sourceImageData,
			actualWidth,
			actualHeight,
			this.cropPoints,
			dpr,
		);

		if (!result.success || !result.imageData || !result.dimensions) {
			return {
				success: result.success,
				message: result.message,
			};
		}

		// Create new image from the result
		createImageFromImageData(
			result.imageData,
			result.dimensions.width,
			result.dimensions.height,
		).then((croppedImage) => {
			// Replace the current image with the cropped version
			this.img = croppedImage;
			
			// Reset rotation
			this.toRotateDegree = 0;

			// Resize canvas to match the cropped image dimensions
			this.resizeToImage(this.img.width, this.img.height);

			// Update image dimensions to match new canvas size
			const cssWidth = parseInt(this.canvas.style.width);
			const cssHeight = parseInt(this.canvas.style.height);
			this.imgX = 0;
			this.imgY = 0;
			this.imgWidth = cssWidth;
			this.imgHeight = cssHeight;

			// Redraw the cropped image
			this.redrawImage();

			// Hide crop points
			this.cropPoints = [];
		this.croppingPointsVisible = false;
		}).catch((error) => {
			console.error("Error creating image from crop:", error);
		});

		return {
			success: true,
			message: "Perspective crop applied successfully",
		};
	}

	/**
	 * Apply current filter configuration to the displayed image
	 * Uses debouncing for performance (200ms delay)
	 */
	private applyCurrentFilters() {
		// Check if any filters are active
		const hasFilters = this.filterConfig.brightness !== 0 
			|| this.filterConfig.contrast !== 0 
			|| this.filterConfig.saturation !== 0 
			|| this.filterConfig.blackAndWhite;

		if (!hasFilters) {
			return; // No filters to apply
		}

		// Get current canvas dimensions
		const cssWidth = parseInt(this.canvas.style.width);
		const cssHeight = parseInt(this.canvas.style.height);
		const dpr = window.devicePixelRatio || 1;
		const actualWidth = Math.floor(cssWidth * dpr);
		const actualHeight = Math.floor(cssHeight * dpr);

		// Get image data from canvas
		const imageData = this.ctx.getImageData(0, 0, actualWidth, actualHeight);

		// Apply filters
		applyFilters(imageData, this.filterConfig);

		// Put filtered image back on canvas
		this.ctx.putImageData(imageData, 0, 0);
	}

	/**
	 * Update filter configuration and redraw with debouncing
	 * @param config - New filter configuration
	 */
	public updateFilters(config: Partial<ImageFilterConfig>) {
		// Merge with existing config
		this.filterConfig = { ...this.filterConfig, ...config };

		// Clear existing debounce timer
		if (this.filterDebounceTimer !== null) {
			clearTimeout(this.filterDebounceTimer);
		}

		// Debounce the redraw (wait 200ms after last update)
		this.filterDebounceTimer = window.setTimeout(() => {
			this.redrawImage();
			
			// Redraw crop points if visible
			if (this.croppingPointsVisible) {
				this.renderCroppingPointsOnCanvas();
			}
			
			this.filterDebounceTimer = null;
		}, 200);
	}

	/**
	 * Reset all filters to default values
	 */
	public resetFilters() {
		this.filterConfig = { ...DEFAULT_FILTER_CONFIG };
		this.redrawImage();

		// Redraw crop points if visible
		if (this.croppingPointsVisible) {
			this.renderCroppingPointsOnCanvas();
		}
	}

	/**
	 * Get current filter configuration
	 * @returns Current filter config
	 */
	public getFilterConfig(): ImageFilterConfig {
		return { ...this.filterConfig };
	}

	/**
	 * Check if an image is loaded
	 * @returns true if image is loaded, false otherwise
	 */
	public isImageLoaded(): boolean {
		return this.img != null;
	}

	// ========== Background Removal Methods ==========

	/**
	 * Enter background removal mode
	 * Saves current state and sets up click listener for color sampling
	 */
	public enterBackgroundRemovalMode(onColorSampled?: (color: RGB) => void): OperationResult {
		if (!this.isImageLoaded()) {
			return { success: false, message: "Please upload photo first!" };
		}

		// Save current state for cancellation
		this.originalImageDataBeforeRemoval = this.getCurrentImageData();
	this.backgroundRemovalMode = true;
	this.sampledBackgroundColor = null;
	this.onColorSampled = onColorSampled || null;

	// Change cursor to crosshair
	this.canvas.setCssProps({ cursor: "crosshair" });

	// Set up click listener for sampling
	this.canvas.addEventListener("click", this.onBackgroundSampleClick.bind(this));

		return { success: true, message: "Click on background to sample" };
	}

	/**
	 * Exit background removal mode
	 */
public exitBackgroundRemovalMode(): void {
	this.backgroundRemovalMode = false;
	
	// Restore default cursor
	this.canvas.setCssProps({ cursor: "default" });
	
	// Remove click listener
	this.canvas.removeEventListener("click", this.onBackgroundSampleClick.bind(this));
}

	/**
	 * Handle click event for sampling background color
	 */
	private onBackgroundSampleClick(event: MouseEvent): void {
		const pos = this.getPointerPosition(event);
		if (!pos) return;

		this.sampleBackgroundAtPoint(pos.x, pos.y);
	}

	/**
	 * Sample background color at specific point
	 * @param x - X coordinate in CSS pixels
	 * @param y - Y coordinate in CSS pixels
	 */
	public sampleBackgroundAtPoint(x: number, y: number): RGB | null {
		const imageData = this.getCurrentImageData();
		
		// Convert CSS pixels to image pixels (account for DPR)
		const dpr = window.devicePixelRatio || 1;
		const imageX = Math.floor(x * dpr);
		const imageY = Math.floor(y * dpr);
		
		const color = sampleColorAtPoint(imageData, imageX, imageY);

		if (color) {
			this.sampledBackgroundColor = color;

			// Notify callback if set
			if (this.onColorSampled) {
				this.onColorSampled(color);
			}

			// Trigger preview if enabled
			if (this.bgRemovalPreviewEnabled) {
				this.previewBackgroundRemoval();
			}
		}

		return color;
	}

	/**
	 * Update tolerance and refresh preview
	 */
	public updateBgRemovalTolerance(tolerance: number): void {
		this.bgRemovalTolerance = tolerance;

		if (this.bgRemovalPreviewEnabled && this.sampledBackgroundColor) {
			this.previewBackgroundRemoval();
		}
	}

	/**
	 * Toggle preview on/off
	 */
	public toggleBgRemovalPreview(enabled: boolean): void {
		this.bgRemovalPreviewEnabled = enabled;

		if (enabled && this.sampledBackgroundColor) {
			this.previewBackgroundRemoval();
		} else {
			this.restoreOriginalBeforeRemoval();
		}
	}

	/**
	 * Show preview of background removal
	 */
	private previewBackgroundRemoval(): void {
		if (!this.sampledBackgroundColor || !this.originalImageDataBeforeRemoval) {
			return;
		}

		const cssWidth = parseInt(this.canvas.style.width);
		const cssHeight = parseInt(this.canvas.style.height);

		// Draw checkerboard pattern first for transparency visibility
		fillCanvasWithCheckerboard(this.ctx, cssWidth, cssHeight);

		const preview = removeBackground(
			this.originalImageDataBeforeRemoval,
			this.sampledBackgroundColor,
			this.bgRemovalTolerance,
		);

		this.ctx.putImageData(preview, 0, 0);
	}

	/**
	 * Apply background removal permanently
	 */
	public async applyBackgroundRemoval(): Promise<OperationResult> {
		if (!this.sampledBackgroundColor) {
			return {
				success: false,
				message: "Please sample a background color first",
			};
		}

		if (!this.originalImageDataBeforeRemoval) {
			return {
				success: false,
				message: "No image data available",
			};
		}

		try {
			const result = removeBackground(
				this.originalImageDataBeforeRemoval,
				this.sampledBackgroundColor,
				this.bgRemovalTolerance,
			);

			// Convert ImageData back to Image for future operations
			// No need to pass dimensions - function will use ImageData's actual dimensions
			this.img = await createImageFromImageData(result);

			// Redraw with new image
			this.redrawImage();

			// Cleanup
			this.originalImageDataBeforeRemoval = null;
			this.exitBackgroundRemovalMode();

			return {
				success: true,
				message: "Background removed successfully",
			};
		} catch (error) {
			return {
				success: false,
				message: `Failed to remove background: ${error.message}`,
			};
		}
	}

	/**
	 * Cancel background removal
	 */
	public cancelBackgroundRemoval(): void {
		this.restoreOriginalBeforeRemoval();
		this.originalImageDataBeforeRemoval = null;
		this.sampledBackgroundColor = null;
		this.exitBackgroundRemovalMode();
	}

	/**
	 * Restore original image before removal
	 */
	private restoreOriginalBeforeRemoval(): void {
		if (this.originalImageDataBeforeRemoval) {
			const cssWidth = parseInt(this.canvas.style.width);
			const cssHeight = parseInt(this.canvas.style.height);
			
			// Draw checkerboard pattern first for transparency visibility
			fillCanvasWithCheckerboard(this.ctx, cssWidth, cssHeight);
			
			this.ctx.putImageData(this.originalImageDataBeforeRemoval, 0, 0);
		}
	}

	/**
	 * Get current image data from canvas (clean, without checkerboard)
	 * Creates a temporary canvas with only the image content for processing
	 */
	private getCurrentImageData(): ImageData {
		const cssWidth = parseInt(this.canvas.style.width);
		const cssHeight = parseInt(this.canvas.style.height);
		const dpr = window.devicePixelRatio || 1;
		const actualWidth = Math.floor(cssWidth * dpr);
		const actualHeight = Math.floor(cssHeight * dpr);

		// Create temporary canvas for clean image data (no checkerboard)
		const tempCanvas = document.createElement("canvas");
		tempCanvas.width = actualWidth;
		tempCanvas.height = actualHeight;
		const tempCtx = tempCanvas.getContext("2d");

		if (!tempCtx) {
			// Fallback to current canvas if temp context fails
			return this.ctx.getImageData(0, 0, actualWidth, actualHeight);
		}

		// Set transform to match display canvas
		tempCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

		// Draw only the image without checkerboard background
		if (this.img) {
			drawImageWithRotation(
				tempCtx,
				this.img,
				cssWidth,
				cssHeight,
				this.toRotateDegree,
			);

			// Apply filters if any are active
			const hasFilters = this.filterConfig.brightness !== 0 
				|| this.filterConfig.contrast !== 0 
				|| this.filterConfig.saturation !== 0 
				|| this.filterConfig.blackAndWhite;

			if (hasFilters) {
				const imageData = tempCtx.getImageData(0, 0, actualWidth, actualHeight);
				applyFilters(imageData, this.filterConfig);
				tempCtx.putImageData(imageData, 0, 0);
			}
		}

		// Get the clean image data
		return tempCtx.getImageData(0, 0, actualWidth, actualHeight);
	}

	/**
	 * Get sampled background color (for UI display)
	 */
	public getSampledBackgroundColor(): RGB | null {
		return this.sampledBackgroundColor;
	}

	/**
	 * Get canvas element for export
	 * @returns Canvas element
	 */
	public getCanvas(): HTMLCanvasElement {
		return this.canvas;
	}

	/**
	 * Get a clean export canvas without checkerboard background
	 * Creates a temporary canvas with only the image content
	 * @returns Canvas element ready for export with transparent background
	 */
	public getExportCanvas(): HTMLCanvasElement {
		const cssWidth = parseInt(this.canvas.style.width);
		const cssHeight = parseInt(this.canvas.style.height);
		const dpr = window.devicePixelRatio || 1;

		// Create temporary canvas for clean export
		const exportCanvas = document.createElement("canvas");
		exportCanvas.width = this.canvas.width;
		exportCanvas.height = this.canvas.height;
		const exportCtx = exportCanvas.getContext("2d");

		if (!exportCtx) {
			throw new Error("Failed to create export canvas context");
		}

		// Set transform to match display canvas
		exportCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

		// Draw the image without checkerboard background
		if (this.img) {
			drawImageWithRotation(
				exportCtx,
				this.img,
				cssWidth,
				cssHeight,
				this.toRotateDegree,
			);

			// Apply filters if any are active
			const hasFilters = this.filterConfig.brightness !== 0 
				|| this.filterConfig.contrast !== 0 
				|| this.filterConfig.saturation !== 0 
				|| this.filterConfig.blackAndWhite;

			if (hasFilters) {
				const actualWidth = Math.floor(cssWidth * dpr);
				const actualHeight = Math.floor(cssHeight * dpr);
				const imageData = exportCtx.getImageData(0, 0, actualWidth, actualHeight);
				applyFilters(imageData, this.filterConfig);
				exportCtx.putImageData(imageData, 0, 0);
			}
		}

		return exportCanvas;
	}
}
