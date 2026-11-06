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

export type BuiltIcon = {
  group: THREE.Group;
  meshes: THREE.Mesh[];
  size: THREE.Vector3;
  triangles: number;
  relief: boolean;
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

  return { shapes, width: widthMm, height: heightMm };
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

function applyFrontUV(geometry: THREE.BufferGeometry, width: number, height: number) {
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const uv = geometry.getAttribute("uv");
  if (!position || !normal || !uv) return;
  for (let i = 0; i < position.count; i++) {
    if (normal.getZ(i) > 0.35) {
      uv.setXY(i, position.getX(i) / width + 0.5, position.getY(i) / height + 0.5);
    }
  }
  uv.needsUpdate = true;
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
  return finishGeometry(geometry, smooth);
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
    };
  }

  const { shapes, width, height } = normalized;

  const add = (geometry: THREE.BufferGeometry, z = 0) => {
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
    const geometry = extrude(shapes, depth * 0.55, Math.min(edge, depth * 0.28), seg(3));
    applyFrontUV(geometry, width, height);
    add(geometry);
  } else {
    const geometry = extrude(shapes, depth, edge, seg(5));
    add(geometry);
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
  };
}

export function disposeIcon(icon: BuiltIcon | null) {
  if (!icon) return;
  icon.group.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.geometry.dispose();
      const material = object.material;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material.dispose();
    }
  });
  icon.meshes.length = 0;
}
