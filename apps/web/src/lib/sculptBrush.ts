import type { WorkplaneShape } from "@/types/sketchforge";

export type SculptBrushKind = "add" | "subtract" | "smooth";

export type SculptBrushSettings = {
  kind: SculptBrushKind;
  radius: number;
  strength: number;
};

export type SculptPoint = { x: number; y: number; z: number };

const WELD_TOLERANCE = 1e-5;
const MIN_DIMENSION = 0.001;

function weldKey(x: number, y: number, z: number) {
  return `${Math.round(x / WELD_TOLERANCE)},${Math.round(y / WELD_TOLERANCE)},${Math.round(z / WELD_TOLERANCE)}`;
}

function normalize(vector: SculptPoint) {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  return length > 1e-10
    ? { x: vector.x / length, y: vector.y / length, z: vector.z / length }
    : { x: 0, y: 1, z: 0 };
}

function clearedSculptMetadata() {
  return {
    cadBrep: undefined,
    cadBrepFrame: undefined,
    cadPrimitiveFrame: undefined,
    cadDisplayEdges: undefined,
    cadDisplayEdgesVersion: undefined,
    edgeTreatments: undefined,
    edgeTreatmentHistory: undefined,
    sketchProfile: undefined,
    sketchFeature: undefined,
    sketchOperation: undefined,
    sketchRevolve: undefined,
  } satisfies Partial<WorkplaneShape>;
}

export function sculptMeshAtPoint(
  shape: WorkplaneShape,
  point: SculptPoint,
  settings: SculptBrushSettings,
): Partial<WorkplaneShape> | null {
  const mesh = shape.importedMesh;
  const radius = Math.max(MIN_DIMENSION, settings.radius);
  const strength = Math.max(0, settings.strength);
  if (!mesh || mesh.positions.length < 9 || strength === 0) return null;

  const vertices: SculptPoint[] = [];
  const sourceToWelded: number[] = [];
  const weldedByPosition = new Map<string, number>();
  for (let index = 0; index < mesh.positions.length; index += 3) {
    const vertex = { x: mesh.positions[index], y: mesh.positions[index + 1], z: mesh.positions[index + 2] };
    const key = weldKey(vertex.x, vertex.y, vertex.z);
    let weldedIndex = weldedByPosition.get(key);
    if (weldedIndex === undefined) {
      weldedIndex = vertices.length;
      weldedByPosition.set(key, weldedIndex);
      vertices.push(vertex);
    }
    sourceToWelded.push(weldedIndex);
  }

  const normals = vertices.map(() => ({ x: 0, y: 0, z: 0 }));
  const neighbors = vertices.map(() => new Set<number>());
  for (let index = 0; index + 2 < sourceToWelded.length; index += 3) {
    const a = sourceToWelded[index];
    const b = sourceToWelded[index + 1];
    const c = sourceToWelded[index + 2];
    const ab = { x: vertices[b].x - vertices[a].x, y: vertices[b].y - vertices[a].y, z: vertices[b].z - vertices[a].z };
    const ac = { x: vertices[c].x - vertices[a].x, y: vertices[c].y - vertices[a].y, z: vertices[c].z - vertices[a].z };
    const faceNormal = {
      x: ab.y * ac.z - ab.z * ac.y,
      y: ab.z * ac.x - ab.x * ac.z,
      z: ab.x * ac.y - ab.y * ac.x,
    };
    [a, b, c].forEach((vertexIndex) => {
      normals[vertexIndex].x += faceNormal.x;
      normals[vertexIndex].y += faceNormal.y;
      normals[vertexIndex].z += faceNormal.z;
    });
    neighbors[a].add(b).add(c);
    neighbors[b].add(a).add(c);
    neighbors[c].add(a).add(b);
  }

  const nextVertices = vertices.map((vertex, index) => {
    const distance = Math.hypot(vertex.x - point.x, vertex.y - point.y, vertex.z - point.z);
    if (distance >= radius) return { ...vertex };
    const normalizedDistance = distance / radius;
    const falloff = (1 - normalizedDistance * normalizedDistance) ** 2;
    if (settings.kind === "smooth") {
      const adjacent = [...neighbors[index]];
      if (adjacent.length === 0) return { ...vertex };
      const average = adjacent.reduce(
        (sum, neighbor) => ({ x: sum.x + vertices[neighbor].x, y: sum.y + vertices[neighbor].y, z: sum.z + vertices[neighbor].z }),
        { x: 0, y: 0, z: 0 },
      );
      const blend = Math.min(0.65, strength) * falloff;
      return {
        x: vertex.x + (average.x / adjacent.length - vertex.x) * blend,
        y: vertex.y + (average.y / adjacent.length - vertex.y) * blend,
        z: vertex.z + (average.z / adjacent.length - vertex.z) * blend,
      };
    }
    const normal = normalize(normals[index]);
    const amount = strength * falloff * (settings.kind === "subtract" ? -1 : 1);
    return { x: vertex.x + normal.x * amount, y: vertex.y + normal.y * amount, z: vertex.z + normal.z * amount };
  });

  const expanded = sourceToWelded.map((index) => nextVertices[index]);
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  expanded.forEach((vertex) => {
    minX = Math.min(minX, vertex.x);
    minY = Math.min(minY, vertex.y);
    minZ = Math.min(minZ, vertex.z);
    maxX = Math.max(maxX, vertex.x);
    maxY = Math.max(maxY, vertex.y);
    maxZ = Math.max(maxZ, vertex.z);
  });
  if (![minX, minY, minZ, maxX, maxY, maxZ].every(Number.isFinite)) return null;

  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const width = Math.max(MIN_DIMENSION, maxX - minX);
  const height = Math.max(MIN_DIMENSION, maxY - minY);
  const depth = Math.max(MIN_DIMENSION, maxZ - minZ);
  const positions = expanded.flatMap((vertex) => [vertex.x - centerX, vertex.y - minY, vertex.z - centerZ]);

  return {
    kind: "mesh",
    x: shape.x + centerX,
    z: shape.z + centerZ,
    elevation: (shape.elevation ?? 0) + minY,
    width,
    height,
    depth,
    size: Math.max(width, depth),
    sculpted: true,
    importedMesh: {
      positions,
      baseWidth: width,
      baseHeight: height,
      baseDepth: depth,
      triangleCount: Math.floor(positions.length / 9),
      sourceFormat: "json",
    },
    ...clearedSculptMetadata(),
  };
}
