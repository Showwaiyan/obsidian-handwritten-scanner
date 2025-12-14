export class ImagePreview {
	private parent: HTMLElement;
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private ratio: number;

	constructor(parent: HTMLElement, element: HTMLCanvasElement, ratio: number) {
		this.parent = parent;
		this.canvas = element;
		this.ratio = ratio;
	}

	public setup() {
		const ctx = this.canvas.getContext("2d");
		if (!ctx) throw new Error("Failed to get 2D contect");
		this.ctx = ctx;

		this.parent.appendChild(this.canvas);

		this.resize();
	}

	private resize() {
		const width: number = this.parent.clientWidth/2;
		const height: number = this.parent.clientHeight/2 / this.ratio;

		// How dpr work
		// It tells how many physical device's pixel(how many px canvas actually use) is equal
		// css size(how big on screen) pixel on screen
		// 2 px on physical device is equal to 1 px of css size
		// it has dpr 2
		const dpr: number = window.devicePixelRatio || 1;

		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;

		this.canvas.width = Math.floor(width * dpr);
		this.canvas.height = Math.floor(height * dpr);

		this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	}
}
