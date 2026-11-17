import { elemBox, MAX_ROW_W, nullBox, structSize } from "./kits";
import type { Box, Kind, Scene } from "./types";

const MARGIN_X = 90;
const STRUCT_Y = 150;

export interface Layout {
  boxes: Map<string, Box>; // every element, plus "<struct>:null" for lists
  kindOf: Map<string, Kind>; // element id -> its structure's kind
  structs: Map<string, Box>; // structure footprints
  text: Map<string, { x: number; y: number }>;
  size: { w: number; h: number }; // board grows to fit
}

/** Pure, deterministic. Structures flow left-to-right in rows; title on top, notes below everything. */
export function layout(scene: Scene): Layout {
  const boxes = new Map<string, Box>(), kindOf = new Map<string, Kind>(), structs = new Map<string, Box>();
  let x = MARGIN_X, y = STRUCT_Y, rowH = 0, right = 0;

  for (const s of scene.structs) {
    const n = s.elems.length, sz = structSize(s.kind, n);
    if (x > MARGIN_X && x - MARGIN_X + sz.w > MAX_ROW_W) {
      x = MARGIN_X;
      y += rowH + 30;
      rowH = 0;
    }
    const o = { x, y };
    s.elems.forEach((id, i) => {
      boxes.set(id, elemBox(s.kind, i, n, o));
      kindOf.set(id, s.kind);
    });
    if (s.kind === "list") boxes.set(`${s.id}:null`, nullBox(n, o));
    structs.set(s.id, { ...o, ...sz });
    x += sz.w + 60;
    rowH = Math.max(rowH, sz.h);
    right = Math.max(right, o.x + sz.w);
  }

  const text = new Map<string, { x: number; y: number }>();
  let noteY = Math.max(520, y + rowH + 50);
  for (const it of scene.items) {
    if (it.kind !== "text") continue;
    if (it.at === "title") text.set(it.id, { x: MARGIN_X, y: 95 });
    else text.set(it.id, { x: MARGIN_X, y: (noteY += 50) - 50 });
  }
  return { boxes, kindOf, structs, text, size: { w: Math.max(1200, right + MARGIN_X), h: Math.max(700, noteY + 40) } };
}
