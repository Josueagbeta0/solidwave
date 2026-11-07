import * as THREE from "three";
import type { BuiltIcon } from "@/lib/studio/geometry";
import { buildReliefGeometry, type ReliefInput } from "@/lib/photo/relief";

/** What a photo turned into: a quick on-device relief, or a full AI model. */
export type PhotoSource =
  | { kind: "quick"; relief: ReliefInput; texture: THREE.Texture }
  | { kind: "ai"; geometry: THREE.BufferGeometry; texture: THREE.Texture | null };

export type PhotoBuildOptions = {
  /** Longest side in the picture plane, in millimetres. */
  sizeMm: number;
  puff: number;
  detail: number;
};

/** Wraps a photo object as a studio object (same shape as a built logo). */
export function buildPhotoIcon(source: PhotoSource, options: PhotoBuildOptions): BuiltIcon {
  let geometry: THREE.BufferGeometry;
  if (source.kind === "quick") {
    geometry = buildReliefGeometry(source.relief, options);
  } else {
    geometry = source.geometry.clone();
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const span = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, 1e-6);
    geometry.scale(options.sizeMm / span, options.sizeMm / span, options.sizeMm / span);
  }
  geometry.computeBoundingBox();

  const mesh = new THREE.Mesh(geometry, new THREE.MeshPhysicalMaterial());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.add(mesh);
  group.updateMatrixWorld(true);

  const size = geometry.boundingBox!.getSize(new THREE.Vector3());
  const index = geometry.getIndex();
  const triangles = index ? index.count / 3 : geometry.getAttribute("position").count / 3;
  return {
    group,
    meshes: [mesh],
    size,
    triangles: Math.round(triangles),
    relief: false,
    artworkCrop: null,
    outlineUV: [],
    photoMap: source.texture,
  };
}

export function disposePhotoSource(source: PhotoSource | null) {
  if (!source) return;
  source.texture?.dispose();
  if (source.kind === "ai") source.geometry.dispose();
}
