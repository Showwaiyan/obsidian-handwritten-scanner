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

	// for continous rotation
	private toRotateDegree: number;

	// for cropping points
	private croppingPointsVisible: boolean;
	private cropPoints: { x: number; y: number }[];

	constructor(
		parent: HTMLElement,
		element: HTMLCanvasElement,
		ratio: number,
	) {
		this.parent = parent;
		this.canvas = element;
		this.ratio = ratio;
	}

	public setup() {
		const ctx = this.canvas.getContext("2d");
		if (!ctx) throw new Error("Failed to get 2D contect");
		this.ctx = ctx;

		this.parent.appendChild(this.canvas);
		this.toRotateDegree = 0;
		this.croppingPointsVisible = false;
		this.cropPoints = [];

		// Wait for next frame to ensure parent has dimensions
		requestAnimationFrame(() => {
			this.resize();
			this.initializePlaceholder();
		});
	}

	private resize() {
		const parentWidth = this.parent.clientWidth;

		const width: number = parentWidth / 1.4;
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

	private initializePlaceholder() {
		// Get CSS dimensions for calculations
		const cssWidth = parseInt(this.canvas.style.width);
		const cssHeight = parseInt(this.canvas.style.height);
		const dpr = window.devicePixelRatio || 1;

		console.log("Canvas dimensions:", cssWidth, cssHeight, "DPR:", dpr);

		// Clear canvas (use CSS dimensions because of DPR transform)
		this.ctx.clearRect(0, 0, cssWidth, cssHeight);

		// Set background color with fallback
		this.ctx.fillStyle = "#f5f5f5";
		this.ctx.fillRect(0, 0, cssWidth, cssHeight);

		const centerX = cssWidth / 2;
		const centerY = cssHeight / 2;

		// Draw icon (camera/image icon)
		const iconSize = Math.min(cssWidth, cssHeight) / 8;
		this.drawImageIcon(centerX, centerY - iconSize, iconSize);

		// Draw placeholder text
		this.ctx.fillStyle = "#888888";
		this.ctx.textAlign = "center";
		this.ctx.textBaseline = "top";

		// Primary text
		const primaryFontSize = Math.max(
			16,
			Math.min(cssWidth, cssHeight) / 20,
		);
		this.ctx.font = `${primaryFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
		this.ctx.fillText(
			"Upload or take a picture",
			centerX,
			centerY + iconSize / 2,
		);

		// Secondary text
		const secondaryFontSize = Math.max(
			12,
			Math.min(cssWidth, cssHeight) / 40,
		);
		this.ctx.font = `${secondaryFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
		this.ctx.fillStyle = "#aaaaaa";
		this.ctx.fillText(
			"to process your handwritten note",
			centerX,
			centerY + iconSize / 2 + primaryFontSize * 1.5,
		);
	}

	private drawImageIcon(x: number, y: number, size: number) {
		const ctx = this.ctx;

		ctx.save();
		ctx.strokeStyle = "#888888";
		ctx.fillStyle = "#888888";
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

	public darawImage(file: File) {
		this.img = new Image();

		this.img.onload = () => {
			// Get CSS dimensions (because we're using DPR transform)
			const cssWidth = parseInt(this.canvas.style.width);
			const cssHeight = parseInt(this.canvas.style.height);

			// Clear canvas and fill with black background (letterbox bars)
			this.ctx.clearRect(0, 0, cssWidth, cssHeight);
			this.ctx.fillStyle = "#000000";
			this.ctx.fillRect(0, 0, cssWidth, cssHeight);

			// Calculate scale to fit image inside canvas (contain behavior)
			const scale = Math.min(
				cssWidth / this.img.width,
				cssHeight / this.img.height,
			);

			// Calculate scaled dimensions
			const scaledWidth = this.img.width * scale;
			const scaledHeight = this.img.height * scale;

			// Calculate position to center the image
			const x = (cssWidth - scaledWidth) / 2;
			const y = (cssHeight - scaledHeight) / 2;

			// Store image position and dimensions for future reference
			this.imgX = x;
			this.imgY = y;
			this.imgWidth = scaledWidth;
			this.imgHeight = scaledHeight;

			// Draw the image centered with letterboxing
			this.ctx.drawImage(this.img, x, y, scaledWidth, scaledHeight);

			URL.revokeObjectURL(this.img.src);
		};

		this.img.src = URL.createObjectURL(file);
	}

	private redrawImage() {
		// Get CSS dimensions
		const cssWidth = parseInt(this.canvas.style.width);
		const cssHeight = parseInt(this.canvas.style.height);

		// Clear canvas and fill with black background (letterbox bars)
		this.ctx.clearRect(0, 0, cssWidth, cssHeight);
		this.ctx.fillStyle = "#000000";
		this.ctx.fillRect(0, 0, cssWidth, cssHeight);

		// Check if image was rotated
		if (this.toRotateDegree !== 0) {
			// Redraw with rotation
			const rad = (this.toRotateDegree * Math.PI) / 180;
			const sin = Math.abs(Math.sin(rad));
			const cos = Math.abs(Math.cos(rad));

			const newWidth = this.imgWidth * cos + this.imgHeight * sin;
			const newHeight = this.imgWidth * sin + this.imgHeight * cos;

			const scale = Math.min(
				cssWidth / newWidth,
				cssHeight / newHeight,
			);

			this.ctx.save();
			this.ctx.translate(cssWidth / 2, cssHeight / 2);
			this.ctx.rotate(rad);
			this.ctx.scale(scale, scale);

			this.ctx.drawImage(
				this.img,
				-this.imgWidth / 2,
				-this.imgHeight / 2,
				this.imgWidth,
				this.imgHeight,
			);

			this.ctx.restore();
		} else {
			// Redraw without rotation
			this.ctx.drawImage(this.img, this.imgX, this.imgY, this.imgWidth, this.imgHeight);
		}
	}

	public rotate(degree: number) {
		console.log("Rotation count:", this.toRotateDegree);
		
		// Update rotation degree
		this.toRotateDegree = this.toRotateDegree + degree;
		
		// Redraw the image with new rotation
		this.redrawImage();
	}

	private drawCroppingPoints() {
		// Initialize crop points at four corners of the image
		this.cropPoints = [
			{ x: this.imgX, y: this.imgY }, // Top-left
			{ x: this.imgX + this.imgWidth, y: this.imgY }, // Top-right
			{ x: this.imgX, y: this.imgY + this.imgHeight }, // Bottom-left
			{ x: this.imgX + this.imgWidth, y: this.imgY + this.imgHeight }, // Bottom-right
		];

		this.ctx.save();

		// Draw connecting lines between points
		this.ctx.beginPath();
		this.ctx.moveTo(this.cropPoints[0].x, this.cropPoints[0].y); // Top-left
		this.ctx.lineTo(this.cropPoints[1].x, this.cropPoints[1].y); // Top-right
		this.ctx.lineTo(this.cropPoints[3].x, this.cropPoints[3].y); // Bottom-right
		this.ctx.lineTo(this.cropPoints[2].x, this.cropPoints[2].y); // Bottom-left
		this.ctx.closePath();
		this.ctx.strokeStyle = "#3b82f6";
		this.ctx.lineWidth = 2;
		this.ctx.stroke();

		// Draw the crop points
		this.cropPoints.forEach((point) => {
			// Draw outer circle (white)
			this.ctx.beginPath();
			this.ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
			this.ctx.fillStyle = "#ffffff";
			this.ctx.fill();
			this.ctx.strokeStyle = "#000000";
			this.ctx.lineWidth = 2;
			this.ctx.stroke();

			// Draw inner circle (blue)
			this.ctx.beginPath();
			this.ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
			this.ctx.fillStyle = "#3b82f6";
			this.ctx.fill();
		});
		this.ctx.restore();

		this.croppingPointsVisible = true;
	}

	private removeCroppingPoints() {
		if (!this.croppingPointsVisible) return;

		// Redraw the image to remove the crop points
		this.redrawImage();

		this.cropPoints = [];
		this.croppingPointsVisible = false;
	}

	public toggleCroppingPoints(show: boolean): { state: boolean; message: string } {
		let state = false;
		let message = "";
		if (this.img == null) {
			state = false;
			message = "Please upload photo first!";
		} else {
			if (show) {
				this.drawCroppingPoints();
				state = true;
				message = "Cropping points displayed";
			} else {
				this.removeCroppingPoints();
				state = true;
				message = "Cropping points removed";
			}
		}
		return { state, message };
	}
}
