import { describe, expect, it } from "vitest";
import { cadSketchRegions, orderedCadSketchPaths } from "@/lib/sketchCadProfile";
import type { SketchPoint, SketchProfile, SketchSegment } from "@/types/sketchforge";

function rectangle(id: string, x: number, z: number, width: number, depth: number) {
  const points: SketchPoint[] = [
    { id: `${id}-0`, x, z },
    { id: `${id}-1`, x: x + width, z },
    { id: `${id}-2`, x: x + width, z: z + depth },
    { id: `${id}-3`, x, z: z + depth },
  ];
  const segments: SketchSegment[] = points.map((point, index) => ({
    id: `${id}-s${index}`,
    kind: "line",
    startId: point.id,
    endId: points[(index + 1) % points.length].id,
  }));
  return { points, segments };
}

function profile(...rectangles: ReturnType<typeof rectangle>[]): SketchProfile {
  return {
    points: rectangles.flatMap((rectangle) => rectangle.points),
    segments: rectangles.flatMap((rectangle) => rectangle.segments),
  };
}

describe("OCCT sketch profile preparation", () => {
  it("orders a closed loop even when its segments arrive out of order", () => {
    const square = rectangle("outer", 0, 0, 20, 10);
    const paths = orderedCadSketchPaths({ ...profile(square), segments: [...square.segments].reverse() });
    expect(paths).toHaveLength(1);
    expect(paths[0].closed).toBe(true);
    expect(paths[0].steps).toHaveLength(4);
  });

  it("assigns an enclosed loop as a hole", () => {
    const regions = cadSketchRegions(profile(
      rectangle("outer", 0, 0, 20, 20),
      rectangle("hole", 5, 5, 4, 4),
    ));
    expect(regions).toHaveLength(1);
    expect(regions[0].outer.id).toContain("outer");
    expect(regions[0].holes).toHaveLength(1);
  });

  it("keeps disjoint loops as separate solids", () => {
    const regions = cadSketchRegions(profile(
      rectangle("left", 0, 0, 4, 4),
      rectangle("right", 10, 0, 4, 4),
    ));
    expect(regions).toHaveLength(2);
    expect(regions.every((region) => region.holes.length === 0)).toBe(true);
  });

  it("ignores open paths when preparing CAD regions", () => {
    const square = rectangle("open", 0, 0, 10, 10);
    square.segments.pop();
    expect(cadSketchRegions(profile(square))).toEqual([]);
  });
});

