import type { GridSize, MeasurementAccuracy, WorkplaneWorkspaceSettings } from "@/types/sketchforge";
import { normalizeScaleForUnits } from "@/lib/measurementUnits";
import type { AppTheme } from "@/lib/themes";

export const DEFAULT_SNAP_GRID: GridSize = "1.0 mm";

export const DEFAULT_WORKPLANE_WORKSPACE: WorkplaneWorkspaceSettings = {
  width: 200,
  depth: 200,
  sizePreset: "200 x 200 mm",
  gridBlockSize: 5,
  gridBlockPreset: "5 mm",
  background: "#f8fbfc",
  showShadows: true,
  showGrid: true,
  cruiseShapes: true,
  zoomSpeed: 5,
  units: "Metric (Default)",
  scale: "1:1 (millimeters)",
  accuracy: 2,
};

const snapGridOptions: GridSize[] = ["Off", "0.1 mm", "0.25 mm", "0.5 mm", "1.0 mm", "2.0 mm", "5.0 mm", "Brick"];

function numberOrDefault(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringOrDefault(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function booleanOrDefault(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function accuracyOrDefault(value: unknown, fallback: MeasurementAccuracy) {
  return value === 1 || value === 2 || value === 3 ? value : fallback;
}

export function normalizeSnapGrid(value: unknown, fallback: GridSize = DEFAULT_SNAP_GRID): GridSize {
  return snapGridOptions.includes(value as GridSize) ? (value as GridSize) : fallback;
}

function themeOrDefault(value: unknown, fallback: AppTheme | undefined): AppTheme | undefined {
  if (!value || typeof value !== "object") return fallback;
  const t = value as Record<string, unknown>;
  if (typeof t.id !== "string" || typeof t.name !== "string" || !t.ui || typeof t.ui !== "object" || !t.viewport || typeof t.viewport !== "object") {
    return fallback;
  }
  return value as AppTheme;
}

const VALID_THEME_IDS = new Set(["light", "dark", "solidworks", "inventor", "custom"]);

export function normalizeWorkspaceSettings(value: unknown, fallback: WorkplaneWorkspaceSettings = DEFAULT_WORKPLANE_WORKSPACE): WorkplaneWorkspaceSettings {
  const candidate = value && typeof value === "object" ? (value as Partial<WorkplaneWorkspaceSettings>) : {};
  const units = stringOrDefault(candidate.units, fallback.units);
  const themeId = VALID_THEME_IDS.has(candidate.themeId ?? "") ? candidate.themeId : fallback.themeId ?? "light";
  return {
    width: numberOrDefault(candidate.width, fallback.width),
    depth: numberOrDefault(candidate.depth, fallback.depth),
    sizePreset: stringOrDefault(candidate.sizePreset, fallback.sizePreset),
    gridBlockSize: numberOrDefault(candidate.gridBlockSize, fallback.gridBlockSize),
    gridBlockPreset: stringOrDefault(candidate.gridBlockPreset, fallback.gridBlockPreset),
    background: stringOrDefault(candidate.background, fallback.background),
    themeId,
    customTheme: themeOrDefault(candidate.customTheme, fallback.customTheme),
    showShadows: booleanOrDefault(candidate.showShadows, fallback.showShadows),
    showGrid: booleanOrDefault(candidate.showGrid, fallback.showGrid),
    cruiseShapes: booleanOrDefault(candidate.cruiseShapes, fallback.cruiseShapes),
    zoomSpeed: numberOrDefault(candidate.zoomSpeed, fallback.zoomSpeed),
    units,
    scale: normalizeScaleForUnits(units, stringOrDefault(candidate.scale, fallback.scale)),
    accuracy: accuracyOrDefault(candidate.accuracy, fallback.accuracy),
  };
}

export function workplaneSettingsFingerprint(workspace: WorkplaneWorkspaceSettings, snapGrid: GridSize) {
  return JSON.stringify({ workspace, snapGrid });
}

export function workspaceHydrationSyncDecision(pendingFingerprint: string | null, currentFingerprint: string) {
  if (pendingFingerprint === null) {
    return { shouldSync: true, pendingFingerprint: null };
  }
  return {
    shouldSync: false,
    pendingFingerprint: currentFingerprint === pendingFingerprint ? null : pendingFingerprint,
  };
}
