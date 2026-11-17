import type { Box, Kind, Point } from "./types";

/** Per-kit geometry. Each kit: element size, the structure's footprint for n elements, and where element i goes. */
export const ELEM: Record<Kind, { w: number; h: number }> = {
  list: { w: 150, h: 70 },
  array: { w: 72, h: 60 },
  stack: { w: 150, h: 48 },
};
export const NULL_BOX = { w: 70, h: 40 };
export const TOP_PAD = 46; // room above elements for the title and labels
export const MAX_ROW_W = 1020;

const listSlot = (n: number) => Math.min(ELEM.list.w + 110, (MAX_ROW_W - NULL_BOX.w - 40) / Math.max(n, 1));
const stackCap = (n: number) => Math.max(n, 4);
const STACK_STEP = ELEM.stack.h + 6;
const STACK_LEFT = 80; // room for "top →"

export function structSize(kind: Kind, n: number): { w: number; h: number } {
  switch (kind) {
    case "list": return { w: n * listSlot(n) + NULL_BOX.w + 20, h: TOP_PAD + ELEM.list.h + 60 };
    case "array": return { w: Math.max(n, 1) * ELEM.array.w + 20, h: TOP_PAD + ELEM.array.h + 30 + 80 };
    case "stack": return { w: STACK_LEFT + ELEM.stack.w + 140, h: TOP_PAD + stackCap(n) * STACK_STEP + 24 };
  }
}

export function elemBox(kind: Kind, i: number, n: number, o: Point): Box {
  const { w, h } = ELEM[kind];
  switch (kind) {
    case "list": return { x: o.x + i * listSlot(n), y: o.y + TOP_PAD, w, h };
    case "array": return { x: o.x + i * w, y: o.y + TOP_PAD, w, h };
    case "stack": return { x: o.x + STACK_LEFT, y: o.y + TOP_PAD + (stackCap(n) - 1 - i) * STACK_STEP + 6, w, h };
  }
}

export function nullBox(n: number, o: Point): Box {
  return { x: o.x + n * listSlot(n), y: o.y + TOP_PAD + (ELEM.list.h - NULL_BOX.h) / 2, ...NULL_BOX };
}

/** Stack container: left wall, base, right wall. */
export function stackWalls(n: number, o: Point) {
  const top = o.y + TOP_PAD, bottom = top + stackCap(n) * STACK_STEP + 10;
  const l = o.x + STACK_LEFT - 10, r = o.x + STACK_LEFT + ELEM.stack.w + 10;
  return { top, bottom, l, r };
}
