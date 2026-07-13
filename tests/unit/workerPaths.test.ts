import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "apps", "web", "src", "workers");

function readWorker(name: string) {
  return readFileSync(join(srcDir, name), "utf-8");
}

describe("OCCT worker loading paths", () => {
  it("sketchCad worker loads from /occt/ (matches copy-occt-wasm.mjs output)", () => {
    const source = readWorker("sketchCad.worker.ts");
    expect(source).toContain("/occt/occt-wasm.js");
    expect(source).toContain("/occt/occt-wasm.wasm");
    expect(source).not.toContain("/assets/occt/");
  });

  it("cadModifier worker loads from /occt/ (matches copy-occt-wasm.mjs output)", () => {
    const source = readWorker("cadModifier.worker.ts");
    expect(source).toContain("/occt/occt-wasm.js");
    expect(source).toContain("/occt/occt-wasm.wasm");
    expect(source).not.toContain("/assets/occt/");
  });

  it("brepKernel loads from /occt/ (consistent with workers)", () => {
    const brepKernelPath = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "apps", "web", "src", "lib", "brepKernel.ts");
    const source = readFileSync(brepKernelPath, "utf-8");
    expect(source).toContain("/occt/index.js");
    expect(source).toContain("/occt/occt-wasm.wasm");
    expect(source).not.toContain("/assets/occt/");
  });
});
