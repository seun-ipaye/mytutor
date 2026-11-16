import { NODE, NULL_BOX, type Point, type Scene } from "./types";

export const BOARD = { w: 1200, h: 700 };
const MARGIN_X = 90;
const FIRST_LIST_Y = 230;
const LIST_SPACING = 230;
const GAP = 110;

export interface Layout {
  pos: Map<string, Point>; // nodes, "<list>:null", text items
  nullOf: Map<string, string>; // list id -> its null id
}

/** Pure, deterministic positions for everything. Same scene -> same picture. */
export function layout(scene: Scene): Layout {
  const pos = new Map<string, Point>();
  const nullOf = new Map<string, string>();

  scene.lists.forEach((list, li) => {
    const y = FIRST_LIST_Y + li * LIST_SPACING;
    const n = list.nodes.length;
    const available = BOARD.w - 2 * MARGIN_X - NULL_BOX.w - 30;
    const slot = n ? Math.min(NODE.w + GAP, available / n) : 0;
    list.nodes.forEach((id, i) => pos.set(id, { x: MARGIN_X + i * slot, y }));
    const nullId = `${list.id}:null`;
    nullOf.set(list.id, nullId);
    pos.set(nullId, { x: MARGIN_X + n * slot, y: y + (NODE.h - NULL_BOX.h) / 2 });
  });

  let notes = 0;
  for (const it of scene.items) {
    if (it.kind !== "text") continue;
    pos.set(it.id, it.at === "title" ? { x: MARGIN_X, y: 100 } : { x: MARGIN_X, y: 540 + notes++ * 50 });
  }
  return { pos, nullOf };
}
