import { describe, expect, it } from "vitest";
import { sculptMeshAtPoint } from "@/lib/sculptBrush";
import type { WorkplaneShape } from "@/types/sketchforge";

function meshShape(positions: number[]): WorkplaneShape {
  return {
    id: "mesh-1",
    name: "Test mesh",
    kind: "mesh",
    color: "#55aadd",
    x: 10,
    z: 20,
    elevation: 3,
    size: 2,
    width: 2,
    depth: 2,
    height: 1,
    rotation: 0,
    importedMesh: {
      positions,
      baseWidth: 2,
      baseDepth: 2,
      baseHeight: 1,
      triangleCount: positions.length / 9,
      sourceFormat: "obj",
      assetId: "original-asset",
      brepStep: "STEP DATA",
    },
    cadBrep: "BREP DATA",
    cadDisplayEdges: [],
    edgeTreatments: [],
    sketchProfile: { points: [], segments: [], constraints: [], dimensions: [], images: [], texts: [], projections: [] },
    sketchOperation: "extrude",
  };
}

const flatSquare = [
  -1, 0, -1, 1, 0, 1, 1, 0, -1,
  -1, 0, -1, -1, 0, 1, 1, 0, 1,
];

const pyramid = [
  0, 1, 0, -1, 0, -1, 1, 0, -1,
  0, 1, 0, 1, 0, -1, 1, 0, 1,
  0, 1, 0, 1, 0, 1, -1, 0, 1,
  0, 1, 0, -1, 0, 1, -1, 0, -1,
];

describe("sculptMeshAtPoint", () => {
  it("adds along averaged normals and keeps duplicate triangle vertices welded", () => {
    const patch = sculptMeshAtPoint(meshShape(flatSquare), { x: 1, y: 0, z: 1 }, { kind: "add", radius: 0.6, strength: 0.4 });
    const positions = patch?.importedMesh?.positions;

    expect(positions).toBeDefined();
    expect(positions?.[4]).toBeCloseTo(0.4);
    expect(positions?.[16]).toBeCloseTo(positions?.[4] ?? 0);
    expect(positions?.[1]).toBeCloseTo(0);
    expect(patch?.height).toBeCloseTo(0.4);
  });

  it("subtracts the surface and rebases the local mesh without moving it in world space", () => {
    const patch = sculptMeshAtPoint(meshShape(flatSquare), { x: 1, y: 0, z: 1 }, { kind: "subtract", radius: 0.6, strength: 0.25 });

    expect(patch?.elevation).toBeCloseTo(2.75);
    expect(patch?.importedMesh?.positions[4]).toBeCloseTo(0);
    expect(patch?.importedMesh?.positions[1]).toBeCloseTo(0.25);
  });

  it("locally remeshes and smooths without collapsing a coarse feature", () => {
    const patch = sculptMeshAtPoint(meshShape(pyramid), { x: 0, y: 1, z: 0 }, { kind: "smooth", radius: 0.5, strength: 0.5 });
    const positions = patch?.importedMesh?.positions ?? [];
    const apexHeights: number[] = [];
    for (let index = 0; index < positions.length; index += 3) {
      if (Math.abs(positions[index]) < 1e-8 && Math.abs(positions[index + 2]) < 1e-8) {
        apexHeights.push(positions[index + 1]);
      }
    }

    expect(patch?.importedMesh?.triangleCount).toBeGreaterThan(4);
    expect(patch?.height).toBeGreaterThan(0.98);
    expect(patch?.height).toBeLessThan(1);
    expect(apexHeights).toHaveLength(4);
    apexHeights.forEach((height) => expect(height).toBeCloseTo(apexHeights[0]));
    expect(patch?.importedMesh?.normals).toHaveLength(positions.length);
  });

  it("limits shape loss across the repeated dabs produced by a stroke", () => {
    let shape = meshShape(pyramid);
    for (let dab = 0; dab < 12; dab += 1) {
      const patch = sculptMeshAtPoint(shape, { x: 0, y: shape.height, z: 0 }, { kind: "smooth", radius: 0.5, strength: 0.5 });
      expect(patch).not.toBeNull();
      shape = { ...shape, ...patch };
    }

    expect(shape.height).toBeGreaterThan(0.9);
  });

  it("remeshes a flat surface without changing its plane or outline", () => {
    const patch = sculptMeshAtPoint(meshShape(flatSquare), { x: 0, y: 0, z: 0 }, { kind: "smooth", radius: 2, strength: 0.5 });
    const positions = patch?.importedMesh?.positions ?? [];

    expect(patch?.importedMesh?.triangleCount).toBeGreaterThan(2);
    expect(patch?.width).toBeCloseTo(2);
    expect(patch?.depth).toBeCloseTo(2);
    for (let index = 1; index < positions.length; index += 3) {
      expect(positions[index]).toBeCloseTo(0);
    }
  });

  it("creates a new mesh resource and clears invalid exact and source metadata", () => {
    const source = meshShape(flatSquare);
    const patch = sculptMeshAtPoint(source, { x: 1, y: 0, z: 1 }, { kind: "add", radius: 0.6, strength: 0.2 });

    expect(patch?.importedMesh).not.toBe(source.importedMesh);
    expect(patch?.importedMesh?.sourceFormat).toBe("json");
    expect(patch?.importedMesh?.assetId).toBeUndefined();
    expect(patch?.importedMesh?.brepStep).toBeUndefined();
    expect(patch?.cadBrep).toBeUndefined();
    expect(patch?.cadDisplayEdges).toBeUndefined();
    expect(patch?.edgeTreatments).toBeUndefined();
    expect(patch?.sketchProfile).toBeUndefined();
    expect(patch?.sketchOperation).toBeUndefined();
    expect(patch?.sculpted).toBe(true);
  });
});
