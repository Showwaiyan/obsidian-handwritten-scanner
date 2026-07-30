import type { CropPoint, Point } from "./types";

export const PAGE_DETECTION_VERSION = "2026-06-14T11:25 ET";

const DETECTION_MAX_DIM = 800;

/**
 * Attempts to detect the four corners of a page/document within the image.
 * Returns points in TL, TR, BL, BR order in full-resolution coordinates,
 * or null if no confident quad was found.
 *
 * Pipeline:
 *   Downscale → HSV paper mask → Median blur → Gaussian blur →
 *   Sobel → NMS → Hysteresis → Dilate ×2 → Contours →
 *   Convex hull → Quad approx → Validate → Scale back up
 */
export function detectPageCorners(imageData: ImageData): CropPoint[] | null {
	const { data: scaled, scale, width, height } = downscale(imageData, DETECTION_MAX_DIM);

	// Paper mask: low saturation AND high brightness = paper/white regions
	const { saturation, value } = toHSVChannels(scaled, width, height);
	const satMask = thresholdBelow(saturation, width, height, 100);
	const valMask = thresholdAbove(value, width, height, 120);
	const paperMask = bitwiseAnd(satMask, valMask, width, height);

	// Edge map
	const gray = toGrayscale(scaled, width, height);
	const denoised = medianFilter5x5(gray, width, height);
	const blurred = gaussianBlur5x5(denoised, width, height);
	const { magnitude, direction } = sobel(blurred, width, height);
	const suppressed = nonMaxSuppression(magnitude, direction, width, height);
	let edges = hysteresisThreshold(suppressed, width, height, 50, 150);
	// Double dilation closes gaps at corners where the page boundary is weak
	edges = dilate3x3(edges, width, height);
	edges = dilate3x3(edges, width, height);

	const contours = findContours(edges, width, height);
	const result = findBestQuad(contours, paperMask, edges, width, height, scale);
	return result;
}

function findBestQuad(
	contours: Point[][],
	paperMask: Uint8Array,
	edges: Uint8Array,
	width: number,
	height: number,
	scale: number
): CropPoint[] | null {
	const candidates = contours
		.map((c) => ({ contour: c, area: contourArea(c) }))
		.sort((a, b) => b.area - a.area);

	for (const { contour } of candidates) {
		if (contour.length < 4) continue;

		const hull = convexHull(contour);
		if (hull.length < 4) continue;

		let quad = approxPolyDP(hull, 0.02 * perimeter(hull));
		if (quad.length !== 4) quad = boundingQuadFromHull(hull);
		if (quad.length !== 4) continue;

		const ordered = orderCorners(quad, width, height);
		if (!isValidQuad(ordered)) continue;

		// Reject quads smaller than 30% of image area (e.g. credit cards on page)
		const quadW = Math.max(
			Math.hypot(ordered[1].x - ordered[0].x, ordered[1].y - ordered[0].y),
			Math.hypot(ordered[2].x - ordered[3].x, ordered[2].y - ordered[3].y)
		);
		const quadH = Math.max(
			Math.hypot(ordered[3].x - ordered[0].x, ordered[3].y - ordered[0].y),
			Math.hypot(ordered[2].x - ordered[1].x, ordered[2].y - ordered[1].y)
		);
		if ((quadW * quadH) / (width * height) < 0.30) continue;

		if (!quadOverlapsPaper(ordered, paperMask, width, height)) continue;
		if (!cornersHaveEdgeSupport(ordered, edges, width, height)) continue;

		// orderCorners returns [TL, TR, BR, BL] but we need [TL, TR, BL, BR]
		// Swap the bottom two corners to match expected format
		return [
			{ x: ordered[0].x / scale, y: ordered[0].y / scale, isDragging: false }, // TL
			{ x: ordered[1].x / scale, y: ordered[1].y / scale, isDragging: false }, // TR
			{ x: ordered[3].x / scale, y: ordered[3].y / scale, isDragging: false }, // BL
			{ x: ordered[2].x / scale, y: ordered[2].y / scale, isDragging: false }, // BR
		];
	}
	return null;
}

// ---------- Preprocessing ----------

function downscale(
	imageData: ImageData,
	maxDim: number
): { data: Uint8ClampedArray; scale: number; width: number; height: number } {
	const { width: w, height: h, data } = imageData;
	const scale = Math.min(1, maxDim / Math.max(w, h));
	if (scale === 1) return { data, scale: 1, width: w, height: h };

	const width = Math.round(w * scale);
	const height = Math.round(h * scale);
	const out = new Uint8ClampedArray(width * height * 4);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const srcX = Math.min(w - 1, Math.floor(x / scale));
			const srcY = Math.min(h - 1, Math.floor(y / scale));
			const srcIdx = (srcY * w + srcX) * 4;
			const dstIdx = (y * width + x) * 4;
			out[dstIdx] = data[srcIdx];
			out[dstIdx + 1] = data[srcIdx + 1];
			out[dstIdx + 2] = data[srcIdx + 2];
			out[dstIdx + 3] = data[srcIdx + 3];
		}
	}
	return { data: out, scale, width, height };
}

function toGrayscale(data: Uint8ClampedArray, width: number, height: number): Float32Array {
	const gray = new Float32Array(width * height);
	for (let i = 0; i < width * height; i++) {
		gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
	}
	return gray;
}

function toHSVChannels(
	data: Uint8ClampedArray,
	width: number,
	height: number
): { saturation: Uint8Array; value: Uint8Array } {
	const saturation = new Uint8Array(width * height);
	const value = new Uint8Array(width * height);
	for (let i = 0; i < width * height; i++) {
		const r = data[i * 4] / 255;
		const g = data[i * 4 + 1] / 255;
		const b = data[i * 4 + 2] / 255;
		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		saturation[i] = Math.round((max === 0 ? 0 : (max - min) / max) * 255);
		value[i] = Math.round(max * 255);
	}
	return { saturation, value };
}

function medianFilter5x5(src: Float32Array, width: number, height: number): Float32Array {
	const out = new Float32Array(width * height);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const window: number[] = [];
			for (let ky = -2; ky <= 2; ky++)
				for (let kx = -2; kx <= 2; kx++)
					window.push(src[clamp(y + ky, 0, height - 1) * width + clamp(x + kx, 0, width - 1)]);
			window.sort((a, b) => a - b);
			out[y * width + x] = window[12];
		}
	}
	return out;
}

function gaussianBlur5x5(src: Float32Array, width: number, height: number): Float32Array {
	const kernel = [2, 4, 5, 4, 2, 4, 9, 12, 9, 4, 5, 12, 15, 12, 5, 4, 9, 12, 9, 4, 2, 4, 5, 4, 2];
	const out = new Float32Array(width * height);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let sum = 0, k = 0;
			for (let ky = -2; ky <= 2; ky++)
				for (let kx = -2; kx <= 2; kx++)
					sum += src[clamp(y + ky, 0, height - 1) * width + clamp(x + kx, 0, width - 1)] * kernel[k++];
			out[y * width + x] = sum / 159;
		}
	}
	return out;
}

// ---------- Binary ops ----------

function thresholdAbove(src: Uint8Array, width: number, height: number, value: number): Uint8Array {
	const out = new Uint8Array(width * height);
	for (let i = 0; i < src.length; i++) out[i] = src[i] >= value ? 255 : 0;
	return out;
}

function thresholdBelow(src: Uint8Array, width: number, height: number, value: number): Uint8Array {
	const out = new Uint8Array(width * height);
	for (let i = 0; i < src.length; i++) out[i] = src[i] < value ? 255 : 0;
	return out;
}

function bitwiseAnd(a: Uint8Array, b: Uint8Array, width: number, height: number): Uint8Array {
	const out = new Uint8Array(width * height);
	for (let i = 0; i < out.length; i++) out[i] = a[i] !== 0 && b[i] !== 0 ? 255 : 0;
	return out;
}

function dilate3x3(src: Uint8Array, width: number, height: number): Uint8Array {
	const out = new Uint8Array(width * height);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let any = false;
			for (let ky = -1; ky <= 1 && !any; ky++)
				for (let kx = -1; kx <= 1; kx++) {
					const sx = x + kx, sy = y + ky;
					if (sx >= 0 && sx < width && sy >= 0 && sy < height && src[sy * width + sx] !== 0) {
						any = true; break;
					}
				}
			out[y * width + x] = any ? 255 : 0;
		}
	}
	return out;
}

// ---------- Edge detection ----------

function sobel(src: Float32Array, width: number, height: number): { magnitude: Float32Array; direction: Float32Array } {
	const magnitude = new Float32Array(width * height);
	const direction = new Float32Array(width * height);
	const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
	const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			let sx = 0, sy = 0, k = 0;
			for (let ky = -1; ky <= 1; ky++)
				for (let kx = -1; kx <= 1; kx++) {
					const v = src[clamp(y + ky, 0, height - 1) * width + clamp(x + kx, 0, width - 1)];
					sx += v * gx[k]; sy += v * gy[k]; k++;
				}
			const idx = y * width + x;
			magnitude[idx] = Math.sqrt(sx * sx + sy * sy);
			direction[idx] = Math.atan2(sy, sx);
		}
	}
	return { magnitude, direction };
}

function nonMaxSuppression(magnitude: Float32Array, direction: Float32Array, width: number, height: number): Float32Array {
	const out = new Float32Array(width * height);
	for (let y = 1; y < height - 1; y++) {
		for (let x = 1; x < width - 1; x++) {
			const idx = y * width + x;
			let angle = direction[idx] * (180 / Math.PI);
			if (angle < 0) angle += 180;
			let n1: number, n2: number;
			if ((angle >= 0 && angle < 22.5) || (angle >= 157.5 && angle <= 180)) { n1 = magnitude[idx - 1]; n2 = magnitude[idx + 1]; }
			else if (angle >= 22.5 && angle < 67.5) { n1 = magnitude[idx - width + 1]; n2 = magnitude[idx + width - 1]; }
			else if (angle >= 67.5 && angle < 112.5) { n1 = magnitude[idx - width]; n2 = magnitude[idx + width]; }
			else { n1 = magnitude[idx - width - 1]; n2 = magnitude[idx + width + 1]; }
			const m = magnitude[idx];
			out[idx] = m >= n1 && m >= n2 ? m : 0;
		}
	}
	return out;
}

function hysteresisThreshold(src: Float32Array, width: number, height: number, low: number, high: number): Uint8Array {
	const strong = 255, weak = 75;
	const out = new Uint8Array(width * height);
	for (let i = 0; i < src.length; i++) {
		if (src[i] >= high) out[i] = strong;
		else if (src[i] >= low) out[i] = weak;
	}
	let changed = true;
	while (changed) {
		changed = false;
		for (let y = 1; y < height - 1; y++) {
			for (let x = 1; x < width - 1; x++) {
				const idx = y * width + x;
				if (out[idx] !== weak) continue;
				for (let ky = -1; ky <= 1; ky++)
					for (let kx = -1; kx <= 1; kx++)
						if (out[(y + ky) * width + (x + kx)] === strong) { out[idx] = strong; changed = true; }
			}
		}
	}
	for (let i = 0; i < out.length; i++) if (out[i] === weak) out[i] = 0;
	return out;
}

// ---------- Contours ----------

function findContours(edges: Uint8Array, width: number, height: number): Point[][] {
	const visited = new Uint8Array(width * height);
	const contours: Point[][] = [];
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const idx = y * width + x;
			if (edges[idx] === 0 || visited[idx]) continue;
			const component: Point[] = [];
			const stack = [idx];
			visited[idx] = 1;
			while (stack.length > 0) {
				const cur = stack.pop()!;
				const cx = cur % width, cy = Math.floor(cur / width);
				component.push({ x: cx, y: cy });
				for (let ny = -1; ny <= 1; ny++)
					for (let nx = -1; nx <= 1; nx++) {
						if (nx === 0 && ny === 0) continue;
						const px = cx + nx, py = cy + ny;
						if (px < 0 || px >= width || py < 0 || py >= height) continue;
						const pidx = py * width + px;
						if (edges[pidx] !== 0 && !visited[pidx]) { visited[pidx] = 1; stack.push(pidx); }
					}
			}
			if (component.length > 60) contours.push(component);
		}
	}
	return contours;
}

function contourArea(points: Point[]): number {
	const hull = convexHull(points);
	if (hull.length < 3) return 0;
	let area = 0;
	for (let i = 0; i < hull.length; i++) {
		const a = hull[i], b = hull[(i + 1) % hull.length];
		area += a.x * b.y - b.x * a.y;
	}
	return Math.abs(area) / 2;
}

function perimeter(points: Point[]): number {
	let total = 0;
	for (let i = 0; i < points.length; i++) {
		const a = points[i], b = points[(i + 1) % points.length];
		total += Math.hypot(b.x - a.x, b.y - a.y);
	}
	return total;
}

function approxPolyDP(points: Point[], epsilon: number): Point[] {
	if (points.length < 3) return points;
	const { index, distance } = findFarthestPoint(points, points[0], points[points.length - 1]);
	if (distance > epsilon) {
		const left = approxPolyDP(points.slice(0, index + 1), epsilon);
		const right = approxPolyDP(points.slice(index), epsilon);
		return [...left.slice(0, -1), ...right];
	}
	return [points[0], points[points.length - 1]];
}

function findFarthestPoint(points: Point[], lineStart: Point, lineEnd: Point): { index: number; distance: number } {
	let maxDist = 0, maxIdx = 0;
	for (let i = 1; i < points.length - 1; i++) {
		const d = pointToLineDistance(points[i], lineStart, lineEnd);
		if (d > maxDist) { maxDist = d; maxIdx = i; }
	}
	return { index: maxIdx, distance: maxDist };
}

function pointToLineDistance(p: Point, a: Point, b: Point): number {
	const dx = b.x - a.x, dy = b.y - a.y;
	const len = Math.hypot(dx, dy);
	if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
	return Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
}

function convexHull(points: Point[]): Point[] {
	const sorted = [...points].sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
	if (sorted.length <= 2) return sorted;
	const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
	const lower: Point[] = [];
	for (const p of sorted) {
		while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
		lower.push(p);
	}
	const upper: Point[] = [];
	for (let i = sorted.length - 1; i >= 0; i--) {
		const p = sorted[i];
		while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
		upper.push(p);
	}
	upper.pop(); lower.pop();
	return [...lower, ...upper];
}

function boundingQuadFromHull(hull: Point[]): Point[] {
	if (hull.length < 4) return [];
	let tl = hull[0], br = hull[0], tr = hull[0], bl = hull[0];
	for (const p of hull) {
		if (p.x + p.y < tl.x + tl.y) tl = p;
		if (p.x + p.y > br.x + br.y) br = p;
		if (p.x - p.y > tr.x - tr.y) tr = p;
		if (p.x - p.y < bl.x - bl.y) bl = p;
	}
	return [tl, tr, br, bl];
}

/**
 * Orders 4 points into TL, TR, BR, BL by finding the point closest
 * to each image corner. More robust than sum/diff extremes when interior
 * edges protrude further diagonally than the true page corners.
 */
function orderCorners(points: Point[], imgWidth = 0, imgHeight = 0): Point[] {
	if (imgWidth > 0 && imgHeight > 0 && points.length >= 4) {
		const imageCorners = [
			{ x: 0, y: 0 },
			{ x: imgWidth, y: 0 },
			{ x: imgWidth, y: imgHeight },
			{ x: 0, y: imgHeight },
		];
		const result: Point[] = [];
		const used = new Set<number>();
		for (const ic of imageCorners) {
			let bestDist = Infinity, bestIdx = -1;
			for (let i = 0; i < points.length; i++) {
				if (used.has(i)) continue;
				const d = Math.hypot(points[i].x - ic.x, points[i].y - ic.y);
				if (d < bestDist) { bestDist = d; bestIdx = i; }
			}
			if (bestIdx >= 0) { result.push(points[bestIdx]); used.add(bestIdx); }
		}
		if (result.length === 4) return result;
	}
	// Fallback: sum/diff extremes
	let tl = points[0], br = points[0], tr = points[0], bl = points[0];
	for (const p of points) {
		if (p.x + p.y < tl.x + tl.y) tl = p;
		if (p.x + p.y > br.x + br.y) br = p;
		if (p.x - p.y > tr.x - tr.y) tr = p;
		if (p.x - p.y < bl.x - bl.y) bl = p;
	}
	return [tl, tr, br, bl];
}

// ---------- Validation ----------

function dist(a: Point, b: Point): number {
	return Math.hypot(a.x - b.x, a.y - b.y);
}

function isValidQuad(ordered: Point[]): boolean {
	for (let i = 0; i < ordered.length; i++)
		for (let j = i + 1; j < ordered.length; j++)
			if (dist(ordered[i], ordered[j]) < 10) return false;

	const [tl, tr, br, bl] = ordered;
	const topDist = dist(tl, tr), bottomDist = dist(bl, br);
	const leftDist = dist(tl, bl), rightDist = dist(tr, br);
	const aspectRatio = (topDist + bottomDist) / (leftDist + rightDist);
	if (aspectRatio < 0.3 || aspectRatio > 3.0) return false;
	if (Math.max(topDist, bottomDist) / Math.min(topDist, bottomDist) > 1.5) return false;
	if (Math.max(leftDist, rightDist) / Math.min(leftDist, rightDist) > 1.5) return false;
	if (Math.min(topDist, bottomDist, leftDist, rightDist) < 20) return false;
	return true;
}

function quadOverlapsPaper(points: Point[], paperMask: Uint8Array, width: number, height: number): boolean {
	const xs = points.map((p) => p.x), ys = points.map((p) => p.y);
	const x0 = Math.max(0, Math.min(...xs)), y0 = Math.max(0, Math.min(...ys));
	const x1 = Math.min(width - 1, Math.max(...xs)), y1 = Math.min(height - 1, Math.max(...ys));
	let paperPixels = 0, total = 0;
	for (let y = y0; y <= y1; y += 10)
		for (let x = x0; x <= x1; x += 10) {
			if (paperMask[Math.round(y) * width + Math.round(x)] > 0) paperPixels++;
			total++;
		}
	return total > 0 && paperPixels / total > 0.15;
}

function cornersHaveEdgeSupport(ordered: Point[], edges: Uint8Array, width: number, height: number, radius = 6): boolean {
	for (const p of ordered) {
		const px = Math.round(p.x), py = Math.round(p.y);
		let found = false;
		for (let dy = -radius; dy <= radius && !found; dy++)
			for (let dx = -radius; dx <= radius; dx++) {
				const sx = clamp(px + dx, 0, width - 1), sy = clamp(py + dy, 0, height - 1);
				if (edges[sy * width + sx] !== 0) { found = true; break; }
			}
		if (!found) return false;
	}
	return true;
}

// ---------- Utils ----------

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
