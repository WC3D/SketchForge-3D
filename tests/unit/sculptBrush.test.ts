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

  it("smooths a raised welded vertex toward its neighbors", () => {
    const pyramid = [
      0, 1, 0, -1, 0, -1, 1, 0, -1,
      0, 1, 0, 1, 0, -1, 1, 0, 1,
      0, 1, 0, 1, 0, 1, -1, 0, 1,
      0, 1, 0, -1, 0, 1, -1, 0, -1,
    ];
    const patch = sculptMeshAtPoint(meshShape(pyramid), { x: 0, y: 1, z: 0 }, { kind: "smooth", radius: 0.5, strength: 0.5 });
    const positions = patch?.importedMesh?.positions ?? [];

    expect(patch?.height).toBeCloseTo(0.5);
    expect(positions[1]).toBeCloseTo(0.5);
    expect(positions[10]).toBeCloseTo(positions[1]);
    expect(positions[19]).toBeCloseTo(positions[1]);
    expect(positions[28]).toBeCloseTo(positions[1]);
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
