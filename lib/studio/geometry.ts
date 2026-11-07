import * as THREE from "three";
import { mergeVertices } from "three-stdlib";
import { toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { TraceResult } from "@/lib/trace";

export type GeometryMode = "extrude" | "stack" | "inflate" | "relief";

/** Mesh density. "ultra" doubles bevel rings and curve samples for close-up renders. */
export type MeshQuality = "draft" | "high" | "ultra";

const qualityProfile: Record<MeshQuality, { curve: number; bevel: number }> = {
  draft: { curve: 12, bevel: 0.6 },
  high: { curve: 32, bevel: 1.4 },
  ultra: { curve: 64, bevel: 2.4 },
};

/**
 * Faces meeting at less than this angle are shaded smooth. Bevels and curved
 * outlines read as rounded, while real corners (caps, sharp vertices) stay crisp.
 */
const CREASE_ANGLE = THREE.MathUtils.degToRad(38);

/** round = quarter-circle bevel · chamfer = one flat 45° facet, like cut glass. */
export type EdgeProfile = "round" | "chamfer";

export type BuildOptions = {
  mode: GeometryMode;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  edgeMm: number;
  quality?: MeshQuality;
  edgeProfile?: EdgeProfile;
};

/** Part of the source image (0–1, from its top-left corner) that the object's UVs span. */
export type ArtworkCrop = { u0: number; v0: number; u1: number; v1: number };

export type BuiltIcon = {
  group: THREE.Group;
  meshes: THREE.Mesh[];
  size: THREE.Vector3;
  triangles: number;
  relief: boolean;
  /** Where to crop the source artwork so it lands exactly on the outline; null if unknown. */
  artworkCrop: ArtworkCrop | null;
  /** Outer silhouette loops (no holes) in UV space, 0–1 with v up. */
  outlineUV: [number, number][][];
};

type FlatShape = {
  outer: THREE.Vector2[];
  holes: THREE.Vector2[][];
};

function flattenShape(shape: THREE.Shape, divisions = 32): FlatShape {
  return {
    outer: shape.getPoints(divisions),
    holes: shape.holes.map((hole) => hole.getPoints(divisions)),
  };
}

function normalizeShapes(
  result: TraceResult,
  widthMm: number,
  heightMm: number,
  divisions: number,
) {
  const flat = result.shapes.map((shape) => flattenShape(shape, divisions));
  const box = new THREE.Box2();
  for (const shape of flat) {
    for (const point of shape.outer) box.expandByPoint(point);
  }
  const size = box.getSize(new THREE.Vector2());
  if (size.x <= 0 || size.y <= 0) return null;

  const cx = (box.min.x + box.max.x) / 2;
  const cy = (box.min.y + box.max.y) / 2;
  const sx = widthMm / size.x;
  const sy = heightMm / size.y;

  const transform = (point: THREE.Vector2) =>
    new THREE.Vector2(
      (point.x - cx) * sx,
      (result.flipY ? cy - point.y : point.y - cy) * sy,
    );

  const shapes: THREE.Shape[] = flat.map((shape) => {
    const outer = shape.outer.map(transform);
    const next = new THREE.Shape(outer);
    next.holes = shape.holes.map((hole) => new THREE.Path(hole.map(transform)));
    return next;
  });

  return { shapes, width: widthMm, height: heightMm, box };
}

/** The source-image rectangle covered by the shapes' bounding box. */
function cropFor(result: TraceResult, box: THREE.Box2): ArtworkCrop | null {
  const frame = result.frame;
  if (!frame || frame.width <= 0 || frame.height <= 0) return null;
  const u = (x: number) => (x - frame.originX) / frame.width;
  const v = (y: number) => (frame.yDown ? (y - frame.originY) / frame.height : (frame.originY - y) / frame.height);
  // The top of the object is the smallest y for y-down sources, the largest otherwise.
  const top = result.flipY ? box.min.y : box.max.y;
  const bottom = result.flipY ? box.max.y : box.min.y;
  return { u0: u(box.min.x), u1: u(box.max.x), v0: v(top), v1: v(bottom) };
}

function finishGeometry(geometry: THREE.BufferGeometry, smooth: boolean) {
  if (smooth) {
    const merged = mergeVertices(geometry, 1e-4);
    merged.computeVertexNormals();
    geometry.dispose();
    return merged;
  }
  const creased = toCreasedNormals(geometry, CREASE_ANGLE);
  if (creased !== geometry) geometry.dispose();
  flattenCaps(creased);
  return creased;
}

/**
 * Keeps the flat front/back faces perfectly flat. Creasing averages the first
 * bevel segment into the cap's edge vertices, which tilts their normals and
 * draws diagonal streaks across large triangles on mirror finishes. The bevel
 * side keeps its smooth normals, so the edge still rolls off softly.
 */
function flattenCaps(geometry: THREE.BufferGeometry) {
  if (geometry.index) return;
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  if (!position || !normal) return;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const face = new THREE.Vector3();
  for (let i = 0; i + 2 < position.count; i += 3) {
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, i + 1);
    c.fromBufferAttribute(position, i + 2);
    face.subVectors(c, b).cross(a.sub(b));
    if (face.lengthSq() < 1e-20) continue;
    face.normalize();
    if (Math.abs(face.z) < 0.9999) continue;
    for (let k = 0; k < 3; k++) normal.setXYZ(i + k, 0, 0, Math.sign(face.z));
  }
  normal.needsUpdate = true;
}

function centerZ(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return;
  const center = (box.min.z + box.max.z) / 2;
  geometry.translate(0, 0, -center);
}

/**
 * Projects the artwork straight through the object: caps show it exactly, and
 * walls and bevels pick the colour just inside the outline at that point
 * (pulled inward along their normal past the bevel), so the sides carry the
 * logo's edge colours instead of whatever surrounds it in the image.
 */
function applyPlanarUV(
  geometry: THREE.BufferGeometry,
  width: number,
  height: number,
  bevel: number,
  margin: number,
) {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  if (!position || !normal) return;
  const uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i++) {
    const nx = normal.getX(i);
    const ny = normal.getY(i);
    // On a round bevel a vertex sits about bevel × (horizontal normal) outside
    // the outline. Pull it back by that, plus a fixed margin, along the
    // horizontal direction: bevels then read colour from inside the artwork
    // instead of its anti-aliased border, which showed as a background-coloured
    // rim (yellow around a logo on yellow).
    const len = Math.hypot(nx, ny);
    const pull = len > 0.02 ? (len * bevel + margin) / len : 0;
    const x = position.getX(i) - nx * pull;
    const y = position.getY(i) - ny * pull;
    uv[i * 2] = x / width + 0.5;
    uv[i * 2 + 1] = y / height + 0.5;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

function extrude(
  shapes: THREE.Shape[],
  depth: number,
  bevel: number,
  bevelSegments = 4,
  smooth = false,
) {
  const safeBevel = Math.max(0.0001, Math.min(bevel, depth / 2));
  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: safeBevel > 0.01,
    bevelThickness: safeBevel,
    bevelSize: safeBevel * 0.85,
    bevelOffset: 0,
    bevelSegments,
    curveSegments: 8,
    steps: 1,
  });
  centerZ(geometry);
  const finished = finishGeometry(geometry, smooth);
  // Walls sit outside the outline by this much (see applyPlanarUV).
  finished.userData.bevelSize = safeBevel > 0.01 ? safeBevel * 0.85 : 0;
  return finished;
}

/**
 * Splits shapes by the bevel they can carry. One edge radius for everything
 * swallowed small parts (a line of fine type under a big wordmark turned
 * into rounded blobs): each shape's bevel is capped to ~30 % of its smallest
 * side, then bucketed so a logo still extrudes in a handful of meshes.
 */
function bevelGroups(shapes: THREE.Shape[], edge: number): Map<number, THREE.Shape[]> {
  const groups = new Map<number, THREE.Shape[]>();
  const step = Math.max(edge / 6, 0.02);
  for (const shape of shapes) {
    const box = new THREE.Box2().setFromPoints(shape.getPoints(8));
    const size = box.getSize(new THREE.Vector2());
    const cap = Math.min(edge, Math.min(size.x, size.y) * 0.3);
    const bevel = edge <= 0 ? 0 : Math.max(step, Math.round(cap / step) * step);
    const list = groups.get(bevel) ?? [];
    list.push(shape);
    groups.set(bevel, list);
  }
  return groups;
}

export function buildIcon(result: TraceResult, options: BuildOptions): BuiltIcon {
  const profile = qualityProfile[options.quality ?? "high"];
  const chamfer = options.edgeProfile === "chamfer";
  // A chamfer is a single facet; creased normals keep it razor sharp.
  const seg = (base: number) => (chamfer ? 1 : Math.max(2, Math.round(base * profile.bevel)));
  const normalized = normalizeShapes(
    result,
    options.widthMm,
    options.heightMm,
    profile.curve,
  );
  const group = new THREE.Group();
  const meshes: THREE.Mesh[] = [];
  const depth = Math.max(0.4, options.depthMm);
  const edge = Math.max(0, Math.min(options.edgeMm, depth / 2));

  if (!normalized) {
    return {
      group,
      meshes,
      size: new THREE.Vector3(),
      triangles: 0,
      relief: false,
      artworkCrop: null,
      outlineUV: [],
    };
  }

  const { shapes, width, height, box: shapeBox } = normalized;
  // Sample a little inside the outline to step off the artwork's anti-aliased
  // edge, counted in source pixels for traced images. Kept small so walls take
  // the logo's outline colour rather than whatever lies deeper inside; the
  // artwork texture fills the edge band itself (see lib/studio/artwork.ts).
  const mmPerUnit = width / Math.max(1e-6, shapeBox.max.x - shapeBox.min.x);
  const margin =
    result.source === "raster"
      ? Math.max(2.5 * mmPerUnit, Math.max(width, height) * 0.003)
      : Math.max(width, height) * 0.006 + 0.3;

  const add = (geometry: THREE.BufferGeometry, z = 0) => {
    applyPlanarUV(geometry, width, height, (geometry.userData.bevelSize as number | undefined) ?? 0, margin);
    const material = new THREE.MeshPhysicalMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = z;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    meshes.push(mesh);
  };

  if (options.mode === "stack") {
    const layers = 4;
    const layerDepth = depth * 0.17;
    const gap = depth * 0.075;
    const total = layers * layerDepth + (layers - 1) * gap;
    let z = -total / 2 + layerDepth / 2;
    for (let index = 0; index < layers; index++) {
      const geometry = extrude(shapes, layerDepth, Math.min(edge, layerDepth * 0.45), seg(3));
      add(geometry, z);
      z += layerDepth + gap;
    }
  } else if (options.mode === "inflate") {
    const body = depth * 0.28;
    const bevel = depth * 0.36;
    const size = Math.min(edge * 1.4 + depth * 0.12, depth * 0.62, 12);
    // Inflate is always round: a single facet would defeat the pillow shape.
    const geometry = extrude(shapes, body, Math.max(size, bevel), Math.max(2, Math.round(10 * profile.bevel)), true);
    add(geometry);
  } else if (options.mode === "relief") {
    for (const [bevel, group] of bevelGroups(shapes, Math.min(edge, depth * 0.28))) {
      add(extrude(group, depth * 0.55, bevel, seg(3)));
    }
  } else {
    for (const [bevel, group] of bevelGroups(shapes, edge)) {
      add(extrude(group, depth, bevel, seg(5)));
    }
  }

  group.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  let triangles = 0;
  group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      const geometry = object.geometry as THREE.BufferGeometry;
      const index = geometry.getIndex();
      const position = geometry.getAttribute("position");
      triangles += index ? index.count / 3 : position ? position.count / 3 : 0;
    }
  });

  return {
    group,
    meshes,
    size,
    triangles: Math.round(triangles),
    relief: options.mode === "relief",
    artworkCrop: cropFor(result, normalized.box),
    outlineUV: shapes.map((shape) =>
      shape.getPoints(profile.curve).map((point): [number, number] => [point.x / width + 0.5, point.y / height + 0.5]),
    ),
  };
}

export function disposeIcon(icon: BuiltIcon | null) {
  if (!icon) return;
  icon.group.traverse((object) => {
    // Only geometry: the canvas owns the (shared) surface material.
    if (object instanceof THREE.Mesh) object.geometry.dispose();
  });
  icon.meshes.length = 0;
}
