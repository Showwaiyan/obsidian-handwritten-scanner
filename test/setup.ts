import { beforeEach, vi } from "vitest";

// Polyfill Obsidian's createEl helper in test environment
if (typeof Element !== "undefined" && !(Element.prototype as any).createEl) {
	(Element.prototype as any).createEl = function (tag: string, o?: any) {
		const el = document.createElement(tag);
		if (o) {
			if (o.type) (el as any).type = o.type;
			if (o.cls) el.className = o.cls;
		}
		this.appendChild(el);
		return el;
	};
}

if (typeof (globalThis as any).createEl === "undefined") {
	(globalThis as any).createEl = function <K extends keyof HTMLElementTagNameMap>(
		tag: K,
		o?: any,
	): HTMLElementTagNameMap[K] {
		const el = document.createElement(tag);
		if (o) {
			if (o.type) (el as any).type = o.type;
			if (o.cls) el.className = o.cls;
		}
		return el as HTMLElementTagNameMap[K];
	};
}

// Create a shared mock context that persists across operations
let mockCtx: any;

// Mock HTMLCanvasElement methods that are not available in happy-dom
beforeEach(() => {
	// Initialize fresh mocks for each test
	mockCtx = {
		canvas: document.createElement("canvas"),
		clearRect: vi.fn(),
		fillRect: vi.fn(),
		fillStyle: "",
		strokeStyle: "",
		lineWidth: 0,
		lineCap: "",
		lineJoin: "",
		textAlign: "",
		textBaseline: "",
		font: "",
		setTransform: vi.fn(),
		save: vi.fn(),
		restore: vi.fn(),
		translate: vi.fn(),
		rotate: vi.fn(),
		scale: vi.fn(),
		drawImage: vi.fn(),
		beginPath: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		closePath: vi.fn(),
		stroke: vi.fn(),
		fill: vi.fn(),
		arc: vi.fn(),
		fillText: vi.fn(),
		strokeRect: vi.fn(),
	};

	// Mock canvas getContext to return our shared mock
	HTMLCanvasElement.prototype.getContext = vi.fn((contextType: string) => {
		if (contextType === "2d") {
			return mockCtx as unknown as CanvasRenderingContext2D;
		}
		return null;
	}) as any;

	// Mock Image
	global.Image = class Image {
		src = "";
		width = 800;
		height = 600;
		onload: (() => void) | null = null;
		onerror: (() => void) | null = null;

		constructor() {
			setTimeout(() => {
				if (this.onload) {
					this.onload();
				}
			}, 0);
		}
	} as any;

	// Mock URL.createObjectURL and revokeObjectURL
	global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
	global.URL.revokeObjectURL = vi.fn();

	// Mock window.devicePixelRatio
	Object.defineProperty(window, "devicePixelRatio", {
		writable: true,
		configurable: true,
		value: 2,
	});

	// Mock requestAnimationFrame
	global.requestAnimationFrame = vi.fn((cb) => {
		cb(0);
		return 0;
	});

	// Mock ImageData for filter tests
	global.ImageData = class ImageData {
		data: Uint8ClampedArray;
		width: number;
		height: number;

		constructor(width: number, height: number);
		constructor(data: Uint8ClampedArray, width: number, height?: number);
		constructor(
			dataOrWidth: Uint8ClampedArray | number,
			widthOrHeight: number,
			height?: number,
		) {
			if (typeof dataOrWidth === "number") {
				// new ImageData(width, height)
				this.width = dataOrWidth;
				this.height = widthOrHeight;
				this.data = new Uint8ClampedArray(this.width * this.height * 4);
			} else {
				// new ImageData(data, width, height?)
				this.data = dataOrWidth;
				this.width = widthOrHeight;
				this.height = height || Math.floor(dataOrWidth.length / (this.width * 4));
			}
		}
	} as any;

	// Mock getImageData and putImageData
	mockCtx.getImageData = vi.fn((x: number, y: number, width: number, height: number) => {
		return new ImageData(width, height);
	});
	mockCtx.putImageData = vi.fn();
});
