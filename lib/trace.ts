import * as THREE from "three";
import { ShapePath } from "three";
import { SVGLoader } from "three-stdlib";

export type TraceMode = "auto" | "dark" | "light" | "alpha" | "color";

export type TraceOptions = {
  mode: TraceMode;
  cutoff: number;
  smoothing: number;
  fillHoles: boolean;
  detail: number;
};

export type TraceResult = {
  shapes: THREE.Shape[];
  colors: string[];
  width: number;
  height: number;
  points: number;
  shapeCount: number;
  source: "vector" | "raster";
  flipY: boolean;
  field?: { data: Float32Array; width: number; height: number };
  /**
   * Where shape coordinates sit on the source image, so the artwork can be
   * cropped to the exact outline: u = (x - originX) / width and
   * v = yDown ? (y - originY) / height : (originY - y) / height, both 0–1 from
   * the image's top-left corner.
   */
  frame?: ImageFrame;
};

export type ImageFrame = { originX: number; originY: number; width: number; height: number; yDown: boolean };

export const defaultTraceOptions: TraceOptions = {
  mode: "auto",
  cutoff: 0.5,
  smoothing: 0.6,
  fillHoles: false,
  detail: 1024,
};

type Point = [number, number];

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/* ------------------------------------------------------------------ */
/* Vector SVG                                                          */
/* ------------------------------------------------------------------ */

export function svgToShapes(svgText: string): TraceResult | null {
  if (typeof window === "undefined") return null;

  const text = svgText
    .replace(/currentColor/g, "#000000")
    .replace(/fill="none"/g, 'fill="none"');

  const loader = new SVGLoader();
  let data: ReturnType<SVGLoader["parse"]>;
  try {
    data = loader.parse(text);
  } catch {
    return null;
  }

  const shapes: THREE.Shape[] = [];
  const colors: string[] = [];
  let points = 0;

  for (const path of data.paths) {
    const style = path.userData?.style as
      | { fill?: string; stroke?: string; strokeWidth?: number }
      | undefined;
    const fill = style?.fill;
    if (!fill || fill === "none") continue;

    const generated = SVGLoader.createShapes(path as unknown as ShapePath);
    for (const shape of generated) {
      const contour = shape.getPoints(18);
      if (contour.length < 3) continue;
      shapes.push(shape);
      colors.push(fill === "currentColor" ? "#26282e" : fill);
      points += contour.length;
      for (const hole of shape.holes) points += hole.getPoints(18).length;
    }
  }

  if (shapes.length === 0) return null;

  const box = new THREE.Box2();
  for (const shape of shapes) {
    for (const point of shape.getPoints(24)) box.expandByPoint(new THREE.Vector2(point.x, point.y));
  }

  const size = box.getSize(new THREE.Vector2());
  if (size.x <= 0 || size.y <= 0) return null;

  const viewBox = parseViewBox(text);
  return {
    shapes,
    colors,
    width: size.x,
    height: size.y,
    points,
    shapeCount: shapes.length,
    source: "vector",
    flipY: true,
    frame: viewBox
      ? { originX: viewBox.x, originY: viewBox.y, width: viewBox.width, height: viewBox.height, yDown: true }
      : undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Raster tracing                                                       */
/* ------------------------------------------------------------------ */

function gaussian(field: Float32Array, width: number, height: number) {
  const kernel = [1, 2, 1];
  const total = 4;
  const temp = new Float32Array(field.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -1; k <= 1; k++) {
        const xx = clamp(x + k, 0, width - 1);
        sum += field[y * width + xx] * kernel[k + 1];
      }
      temp[y * width + x] = sum / total;
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let k = -1; k <= 1; k++) {
        const yy = clamp(y + k, 0, height - 1);
        sum += temp[yy * width + x] * kernel[k + 1];
      }
      field[y * width + x] = sum / total;
    }
  }
}

function buildField(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  mode: TraceMode,
): { field: Float32Array; resolved: TraceMode } {
  const total = width * height;
  let transparent = 0;
  for (let i = 0; i < total; i++) {
    if (pixels[i * 4 + 3] < 250) transparent++;
  }
  // Auto: follow transparency when there is some; otherwise treat everything
  // that differs from the background colour as the logo. Picking only "dark"
  // pixels lost pale parts on white (a yellow chip) and swallowed whole
  // dark backgrounds (a logo on burgundy).
  const resolved: TraceMode = mode === "auto" ? (transparent > total * 0.01 ? "alpha" : "color") : mode;

  const field = new Float32Array(total);

  if (resolved === "alpha") {
    for (let i = 0; i < total; i++) field[i] = pixels[i * 4 + 3] / 255;
    return { field, resolved };
  }

  if (resolved === "color") {
    // Background = per-channel median of the image border: robust to a logo
    // touching an edge, JPEG noise or a stray watermark.
    const border: number[] = [];
    for (let x = 0; x < width; x++) border.push(x, (height - 1) * width + x);
    for (let y = 1; y < height - 1; y++) border.push(y * width, y * width + width - 1);
    const median = (channel: number) => {
      const values = border.map((index) => pixels[index * 4 + channel]).sort((a, b) => a - b);
      return values[values.length >> 1];
    };
    const rr = median(0);
    const gg = median(1);
    const bb = median(2);
    // Distance in a perceptually weighted RGB space. With the default 0.5
    // cutoff the edge sits ~75/255 from the background: pale parts (a yellow
    // chip on white, light grey type) still count, while JPEG ringing around
    // dark outlines (which drew a background-coloured rim) does not.
    for (let i = 0; i < total; i++) {
      const dr = (pixels[i * 4] - rr) * 0.9;
      const dg = (pixels[i * 4 + 1] - gg) * 1.2;
      const db = (pixels[i * 4 + 2] - bb) * 0.8;
      const distance = Math.sqrt(dr * dr + dg * dg + db * db) / 150;
      field[i] = clamp(distance, 0, 1);
    }
    return { field, resolved };
  }

  const inverted = resolved === "dark";
  for (let i = 0; i < total; i++) {
    const r = pixels[i * 4] / 255;
    const g = pixels[i * 4 + 1] / 255;
    const b = pixels[i * 4 + 2] / 255;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    field[i] = inverted ? 1 - lum : lum;
  }
  return { field, resolved };
}

/** Separable square max/min filter (grayscale dilation / erosion), in place. */
function morph(
  field: Float32Array,
  width: number,
  height: number,
  radius: number,
  pick: (a: number, b: number) => number,
) {
  const temp = new Float32Array(field.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let value = field[row + x];
      const from = Math.max(0, x - radius);
      const to = Math.min(width - 1, x + radius);
      for (let k = from; k <= to; k++) value = pick(value, field[row + k]);
      temp[row + x] = value;
    }
  }
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let value = temp[y * width + x];
      const from = Math.max(0, y - radius);
      const to = Math.min(height - 1, y + radius);
      for (let k = from; k <= to; k++) value = pick(value, temp[k * width + x]);
      field[y * width + x] = value;
    }
  }
}

function marchingSquares(
  field: Float32Array,
  width: number,
  height: number,
  threshold: number,
): Point[][] {
  const segments: [Point, Point][] = [];
  const step = 1;

  for (let y = 0; y < height - step; y += step) {
    for (let x = 0; x < width - step; x += step) {
      const tl = field[y * width + x];
      const tr = field[y * width + x + step];
      const br = field[(y + step) * width + x + step];
      const bl = field[(y + step) * width + x];

      const inside =
        (tl > threshold ? 8 : 0) |
        (tr > threshold ? 4 : 0) |
        (br > threshold ? 2 : 0) |
        (bl > threshold ? 1 : 0);

      if (inside === 0 || inside === 15) continue;

      const top: Point = [x + (threshold - tl) / (tr - tl), y];
      const right: Point = [x + step, y + (threshold - tr) / (br - tr)];
      const bottom: Point = [x + (threshold - bl) / (br - bl), y + step];
      const left: Point = [x, y + (threshold - tl) / (bl - tl)];

      switch (inside) {
        case 1:
        case 14:
          segments.push([left, bottom]);
          break;
        case 2:
        case 13:
          segments.push([bottom, right]);
          break;
        case 3:
        case 12:
          segments.push([left, right]);
          break;
        case 4:
        case 11:
          segments.push([top, right]);
          break;
        case 5:
          segments.push([left, top]);
          segments.push([bottom, right]);
          break;
        case 6:
        case 9:
          segments.push([top, bottom]);
          break;
        case 7:
        case 8:
          segments.push([left, top]);
          break;
        case 10:
          segments.push([left, bottom]);
          segments.push([top, right]);
          break;
      }
    }
  }

  // Stitch segments into closed contours.
  const key = (point: Point) =>
    `${Math.round(point[0] * 10000)},${Math.round(point[1] * 10000)}`;
  const adjacency = new Map<string, number[]>();
  segments.forEach((segment, index) => {
    for (const point of segment) {
      const k = key(point);
      const list = adjacency.get(k);
      if (list) list.push(index);
      else adjacency.set(k, [index]);
    }
  });

  const used = new Uint8Array(segments.length);
  const loops: Point[][] = [];

  for (let i = 0; i < segments.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const loop: Point[] = [segments[i][0], segments[i][1]];
    let current = segments[i][1];

    for (let guard = 0; guard < segments.length + 10; guard++) {
      const candidates = adjacency.get(key(current));
      if (!candidates) break;
      let next = -1;
      for (const candidate of candidates) {
        if (!used[candidate]) {
          next = candidate;
          break;
        }
      }
      if (next === -1) break;
      used[next] = 1;
      const [a, b] = segments[next];
      const other = key(a) === key(current) ? b : a;
      loop.push(other);
      current = other;
      if (key(current) === key(loop[0])) break;
    }

    if (loop.length > 3) loops.push(loop);
  }

  return loops;
}

function rdp(points: Point[], tolerance: number): Point[] {
  if (points.length < 3) return points;
  const first = points[0];
  const last = points[points.length - 1];
  let index = -1;
  let maxDistance = 0;
  const dx = last[0] - first[0];
  const dy = last[1] - first[1];
  const denom = Math.hypot(dx, dy) || 1;

  for (let i = 1; i < points.length - 1; i++) {
    const distance = Math.abs(
      dy * points[i][0] - dx * points[i][1] + last[0] * first[1] - last[1] * first[0],
    ) / denom;
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }

  if (maxDistance > tolerance && index > 0) {
    const left = rdp(points.slice(0, index + 1), tolerance);
    const right = rdp(points.slice(index), tolerance);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

function simplifyClosed(points: Point[], tolerance: number): Point[] {
  if (tolerance <= 0 || points.length < 5) return points;
  let farthest = 1;
  let max = -1;
  for (let i = 2; i < points.length; i++) {
    const d = (points[i][0] - points[0][0]) ** 2 + (points[i][1] - points[0][1]) ** 2;
    if (d > max) {
      max = d;
      farthest = i;
    }
  }
  const a = rdp(points.slice(0, farthest + 1), tolerance);
  const b = rdp(points.slice(farthest).concat([points[0]]), tolerance);
  const result = a.slice(0, -1).concat(b.slice(0, -1));
  return result.length >= 3 ? result : points;
}

function chaikin(points: Point[], iterations: number): Point[] {
  let result = points;
  for (let iteration = 0; iteration < iterations; iteration++) {
    const next: Point[] = [];
    for (let i = 0; i < result.length; i++) {
      const a = result[i];
      const b = result[(i + 1) % result.length];
      next.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      next.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    result = next;
  }
  return result;
}

function area(points: Point[]) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum / 2;
}

function pointInPolygon(point: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0];
    const yi = polygon[i][1];
    const xj = polygon[j][0];
    const yj = polygon[j][1];
    const intersect =
      yi > point[1] !== yj > point[1] &&
      point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function traceField(
  field: Float32Array,
  width: number,
  height: number,
  options: TraceOptions,
): TraceResult {
  const loops = marchingSquares(field, width, height, options.cutoff);
  const smoothing = clamp(options.smoothing, 0, 4);
  const tolerance = smoothing * 0.55;
  const iterations = smoothing > 1.8 ? 2 : smoothing > 0.55 ? 1 : 0;

  const contours: { points: Point[]; area: number; box: THREE.Box2 }[] = [];
  for (const loop of loops) {
    if (loop.length < 8) continue;
    let points = iterations ? chaikin(loop, iterations) : loop;
    points = simplifyClosed(points, tolerance);
    if (points.length < 3) continue;
    const a = Math.abs(area(points));
    if (a < 4) continue;
    const box = new THREE.Box2();
    for (const point of points) box.expandByPoint(new THREE.Vector2(point[0], point[1]));
    contours.push({ points, area: a, box });
  }

  // Sort big first so containment tests meet parents before children.
  contours.sort((a, b) => b.area - a.area);

  const depth = new Array(contours.length).fill(0);
  for (let i = 0; i < contours.length; i++) {
    for (let j = i + 1; j < contours.length; j++) {
      if (contours[j].box.containsPoint(new THREE.Vector2(...contours[i].points[0]))) {
        if (pointInPolygon(contours[i].points[0], contours[j].points)) depth[i]++;
      }
    }
  }

  const cx = width / 2;
  const cy = height / 2;
  let pointsTotal = 0;
  const shapes: THREE.Shape[] = [];
  const outerIndices: number[] = [];

  const toVector = (points: Point[]) =>
    points.map(([x, y]) => new THREE.Vector2(x - cx, cy - y));

  contours.forEach((contour, index) => {
    if (depth[index] % 2 !== 0) return;
    const shape = new THREE.Shape(toVector(contour.points));
    outerIndices.push(index);
    pointsTotal += contour.points.length;
    shapes.push(shape);
  });

  if (!options.fillHoles) {
    contours.forEach((contour, index) => {
      if (depth[index] % 2 === 0) return;
      // Find the smallest enclosing outer contour.
      let parent = -1;
      let parentArea = Infinity;
      for (let j = 0; j < contours.length; j++) {
        if (depth[j] % 2 !== 0 || j === index) continue;
        if (contours[j].area < parentArea &&
            contours[j].box.containsPoint(new THREE.Vector2(...contour.points[0])) &&
            pointInPolygon(contour.points[0], contours[j].points)) {
          parent = j;
          parentArea = contours[j].area;
        }
      }
      if (parent === -1) return;
      const shapeIndex = outerIndices.indexOf(parent);
      if (shapeIndex === -1) return;
      const path = new THREE.Path(toVector(contour.points));
      shapes[shapeIndex].holes.push(path);
      pointsTotal += contour.points.length;
    });
  }

  const shapeBounds = new THREE.Box2();
  for (const shape of shapes) {
    for (const point of shape.getPoints(12)) shapeBounds.expandByPoint(point);
    for (const hole of shape.holes) {
      for (const point of hole.getPoints(12)) shapeBounds.expandByPoint(point);
    }
  }
  const shapeSize = shapeBounds.getSize(new THREE.Vector2());

  return {
    shapes,
    colors: shapes.map(() => "#26282e"),
    width: Math.max(1, shapeSize.x),
    height: Math.max(1, shapeSize.y),
    points: pointsTotal,
    shapeCount: shapes.length,
    source: "raster",
    flipY: false,
    field: { data: field, width, height },
    // Shapes are centred on the traced canvas, y up.
    frame: { originX: -cx, originY: cy, width, height, yDown: false },
  };
}

export function traceImageSource(
  image: HTMLImageElement | ImageBitmap,
  options: TraceOptions,
): TraceResult {
  const naturalWidth = "naturalWidth" in image ? image.naturalWidth : image.width;
  const naturalHeight = "naturalHeight" in image ? image.naturalHeight : image.height;
  const max = Math.max(64, Math.min(options.detail, 2048));
  const scale = Math.min(1, max / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(8, Math.round(naturalWidth * scale));
  const height = Math.max(8, Math.round(naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas 2D is unavailable");
  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const data = context.getImageData(0, 0, width, height).data;
  const { field, resolved } = buildField(data, width, height, options.mode);
  if (resolved === "color") {
    // Close thin background-coloured slits (inner line art, small type, letters
    // almost touching) so the object keeps the logo's silhouette; the artwork
    // texture still paints those lines. Then pull the edge in by one pixel to
    // drop the anti-aliased / JPEG-ringing rim of background colour.
    const radius = Math.max(1, Math.round(Math.max(width, height) * 0.004));
    morph(field, width, height, radius, Math.max);
    morph(field, width, height, radius + 1, Math.min);
  }
  gaussian(field, width, height);
  return traceField(field, width, height, options);
}

export function loadHtmlImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image"));
    image.src = source;
  });
}

export function normalizeSvgMarkup(svgText: string): string {
  if (/<svg[^>]*\bwidth\s*=/.test(svgText) && /<svg[^>]*\bheight\s*=/.test(svgText)) {
    return svgText;
  }
  const size = parseSvgSize(svgText);
  if (!size) return svgText;
  const scale = Math.min(1, 1024 / Math.max(size.width, size.height));
  const width = Math.max(1, Math.round(size.width * scale));
  const height = Math.max(1, Math.round(size.height * scale));
  return svgText.replace(/<svg\b/i, `<svg width="${width}" height="${height}"`);
}

export async function rasterizeSvg(svgText: string): Promise<HTMLImageElement> {
  const markup = normalizeSvgMarkup(svgText);
  const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = await loadHtmlImage(url);
    return image;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/** The SVG's user-space rectangle (viewBox, or 0 0 width height). */
function parseViewBox(svgText: string): { x: number; y: number; width: number; height: number } | null {
  const match = svgText.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (match) {
    const parts = match[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n)) && parts[2] > 0 && parts[3] > 0) {
      return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
    }
  }
  const size = parseSvgSize(svgText);
  return size && size.width > 0 && size.height > 0 ? { x: 0, y: 0, ...size } : null;
}

export function parseSvgSize(svgText: string): { width: number; height: number } | null {
  const match = svgText.match(/viewBox\s*=\s*["']([^"']+)["']/i);
  if (match) {
    const parts = match[1].trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      return { width: parts[2], height: parts[3] };
    }
  }
  const width = svgText.match(/\bwidth\s*=\s*["']([\d.]+)/i);
  const height = svgText.match(/\bheight\s*=\s*["']([\d.]+)/i);
  if (width && height) {
    return { width: parseFloat(width[1]), height: parseFloat(height[1]) };
  }
  return null;
}
