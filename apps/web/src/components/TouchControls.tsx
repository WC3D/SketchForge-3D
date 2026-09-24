"use client";

import { useState } from "react";
import { Redo2, Undo2 } from "lucide-react";

export type TouchHistory = { undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean };

export function TouchControls({ navigate, onNavigateChange, multiSelect, onMultiSelectChange, sketch = false, history }: {
  navigate: boolean;
  onNavigateChange: (value: boolean) => void;
  multiSelect?: boolean;
  onMultiSelectChange?: (value: boolean) => void;
  sketch?: boolean;
  history?: TouchHistory;
}) {
  const [help, setHelp] = useState(false);
  return (
    <div className="touch-controls" aria-label="Touch controls" onPointerDown={(event) => event.stopPropagation()}>
      <div className="touch-controls-buttons">
        <button type="button" aria-label={sketch ? "Draw / select" : "Edit"} aria-pressed={!navigate} onClick={() => onNavigateChange(false)}>{sketch ? "Draw" : "Edit"}</button>
        <button type="button" aria-label="Navigate" aria-pressed={navigate} onClick={() => onNavigateChange(true)}>View</button>
        {onMultiSelectChange ? <button type="button" aria-label="Multi-select" aria-pressed={multiSelect} onClick={() => onMultiSelectChange(!multiSelect)}>Multi</button> : null}
        {history ? <>
          <button type="button" aria-label="Touch undo" disabled={!history.canUndo} onClick={history.undo}><Undo2 size={20} aria-hidden="true" /></button>
          <button type="button" aria-label="Touch redo" disabled={!history.canRedo} onClick={history.redo}><Redo2 size={20} aria-hidden="true" /></button>
        </> : null}
        <button type="button" aria-expanded={help} aria-label="Touch gesture help" onClick={() => setHelp(!help)}>?</button>
      </div>
      {help ? <p role="status">{sketch
        ? "Use one finger to draw or select. Pinch to zoom; drag two fingers to pan. Navigate lets one finger pan without drawing."
        : "Tap to select. Drag a selected object to move it; drag empty space to orbit. Pinch to zoom; drag two fingers to pan. Navigate orbits anywhere without editing. In Sculpt, use Edit to brush."} Pen input uses the active tool.</p> : null}
    </div>
  );
}
