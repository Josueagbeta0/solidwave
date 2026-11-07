import * as THREE from "three";

/**
 * Builds a closed, puffed 3D object from a photo's cut-out mask and depth map.
 *
 * The front follows the estimated depth on top of a rounded "pillow" profile
 * (the distance to the outline drives a circular falloff); the back is the
 * same pillow, smooth. Front and back share their outline vertices, so the
 * mesh is closed and prints as a solid. Everything runs on a small grid
 * (~384 px on the long side): fast, and plenty for a relief.
 */

export type ReliefInput = {
  width: number;
  height: number;
  /** Cut-out coverage per pixel, 0–1. */
  alpha: Float32Array;
  /** Relative depth per pixel, 0–1, 1 = nearest. */
  depth: Float32Array;
};

export type ReliefOptions = {
  /** Size of the longest side, in millimetres. */
  sizeMm: number;
  /** Roundness of the body, 0–1. */
  puff: number;
  /** How much of the estimated depth shows on the front, 0–1. */
  detail: number;
};

/** Pixel grid kept: the largest blob plus any blob at least 2 % of it. */
function cleanMask(alpha: Float32Array, width: number, height: number) {
  const inside = new Uint8Array(width * height);
  for (let i = 0; i < inside.length; i++) inside[i] = alpha[i] >= 0.5 ? 1 : 0;

  const label = new Int32Array(width * height).fill(-1);
  const sizes: number[] = [];
  const stack: number[] = [];
  for (let start = 0; start < inside.length; start++) {
    if (!inside[start] || label[start] >= 0) continue;
    const id = sizes.length;
    let count = 0;
    stack.push(start);
    label[start] = id;
    while (stack.length) {
      const index = stack.pop()!;
      count++;
      const x = index % width;
      const y = (index - x) / width;
      const visit = (next: number) => {
        if (inside[next] && label[next] < 0) {
          label[next] = id;
          stack.push(next);
        }
      };
      if (x > 0) visit(index - 1);
      if (x < width - 1) visit(index + 1);
      if (y > 0) visit(index - width);
      if (y < height - 1) visit(index + width);
    }
    sizes.push(count);
  }
  const biggest = Math.max(0, ...sizes);
  for (let i = 0; i < inside.length; i++) {
    if (inside[i] && sizes[label[i]] < biggest * 0.02) inside[i] = 0;
  }
  // The grid edge is always outside, so every outline closes.
  for (let x = 0; x < width; x++) inside[x] = inside[(height - 1) * width + x] = 0;
  for (let y = 0; y < height; y++) inside[y * width] = inside[y * width + width - 1] = 0;
  return inside;
}

/** Distance (in pixels) from each inside pixel to the outside; two-pass 3-4 chamfer. */
function distanceInside(inside: Uint8Array, width: number, height: number) {
  const big = 1e9;
  const dist = new Float32Array(width * height);
  for (let i = 0; i < dist.length; i++) dist[i] = inside[i] ? big : 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (!dist[i]) continue;
      dist[i] = Math.min(dist[i], dist[i - 1] + 3, dist[i - width] + 3, dist[i - width - 1] + 4, dist[i - width + 1] + 4);
    }
  }
  for (let y = height - 2; y > 0; y--) {
    for (let x = width - 2; x > 0; x--) {
      const i = y * width + x;
      if (!dist[i]) continue;
      dist[i] = Math.min(dist[i], dist[i + 1] + 3, dist[i + width] + 3, dist[i + width + 1] + 4, dist[i + width - 1] + 4);
    }
  }
  for (let i = 0; i < dist.length; i++) dist[i] /= 3;
  return dist;
}

const smoothstep = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

export function buildReliefGeometry(input: ReliefInput, options: ReliefOptions) {
  const { width, height, alpha, depth } = input;
  const inside = cleanMask(alpha, width, height);
  const dist = distanceInside(inside, width, height);

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let maxDist = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!inside[i]) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      maxDist = Math.max(maxDist, dist[i]);
    }
  }
  if (maxDist === 0) throw new Error("empty-mask");
  const span = Math.max(maxX - minX, maxY - minY, 1);

  // Depth range inside the cut-out, ignoring the extreme 2 % at each end.
  const values: number[] = [];
  for (let i = 0; i < inside.length; i += 3) if (inside[i]) values.push(depth[i]);
  values.sort((a, b) => a - b);
  const low = values[Math.floor(values.length * 0.02)] ?? 0;
  const high = values[Math.floor(values.length * 0.98)] ?? 1;
  const range = Math.max(high - low, 1e-4);
  let mean = 0;
  for (const value of values) mean += Math.min(1, Math.max(0, (value - low) / range));
  mean /= Math.max(1, values.length);

  // Pillow radius: how far in from the outline the body keeps rising.
  const radius = Math.max(2, Math.min(maxDist, span * (0.05 + options.puff * 0.13)));
  const pillowHeight = radius * (0.55 + options.puff * 0.45);
  const detailHeight = span * 0.16 * options.detail;
  const pillow = (d: number) => {
    const t = Math.min(d / radius, 1);
    return pillowHeight * Math.sqrt(1 - (1 - t) * (1 - t));
  };

  const boundary = (i: number) =>
    inside[i] && (!inside[i - 1] || !inside[i + 1] || !inside[i - width] || !inside[i + width]);

  const scale = options.sizeMm / span;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const positions: number[] = [];
  const uvs: number[] = [];
  const front = new Int32Array(width * height).fill(-1);
  const back = new Int32Array(width * height).fill(-1);

  const push = (x: number, y: number, z: number) => {
    positions.push((x - cx) * scale, -(y - cy) * scale, z * scale);
    uvs.push((x + 0.5) / width, 1 - (y + 0.5) / height);
    return positions.length / 3 - 1;
  };

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (!inside[i]) continue;
      if (boundary(i)) {
        // Slide outline vertices to where coverage crosses 50 %: smooth silhouette, no staircase.
        const gx = (alpha[i + 1] - alpha[i - 1]) / 2;
        const gy = (alpha[i + width] - alpha[i - width]) / 2;
        const g = Math.hypot(gx, gy);
        let px = x;
        let py = y;
        if (g > 1e-3) {
          const step = Math.min(1, Math.max(0, (alpha[i] - 0.5) / g));
          px -= (gx / g) * step;
          py -= (gy / g) * step;
        }
        front[i] = back[i] = push(px, py, 0);
        continue;
      }
      const d = dist[i];
      const body = pillow(d);
      const relief = (Math.min(1, Math.max(0, (depth[i] - low) / range)) - mean) * detailHeight * smoothstep(d / radius);
      front[i] = push(x, y, body + relief);
      back[i] = push(x, y, -body * 0.85);
    }
  }

  const indices: number[] = [];
  const face = (a: number, b: number, c: number, side: Int32Array, flip: boolean) => {
    const ia = side[a];
    const ib = side[b];
    const ic = side[c];
    if (ia < 0 || ib < 0 || ic < 0) return;
    if (flip) indices.push(ia, ib, ic);
    else indices.push(ia, ic, ib);
  };
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const a = y * width + x;
      const b = a + 1;
      const c = a + width;
      const d = c + 1;
      const count = inside[a] + inside[b] + inside[c] + inside[d];
      if (count < 3) continue;
      for (const [side, flip] of [
        [front, false],
        [back, true],
      ] as const) {
        if (count === 4) {
          face(a, b, c, side, flip);
          face(b, d, c, side, flip);
        } else if (!inside[a]) face(b, d, c, side, flip);
        else if (!inside[b]) face(a, d, c, side, flip);
        else if (!inside[c]) face(a, b, d, side, flip);
        else face(a, b, c, side, flip);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
