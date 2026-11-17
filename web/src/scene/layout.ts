import { CODE, ELEM, elemBox, MAX_ROW_W, nullBox, structSize, TOP_PAD, TREE } from "./kits";
import type { Box, ElemItem, Kind, Scene, Struct } from "./types";

const MARGIN_X = 90;
const STRUCT_Y = 150;

export interface Layout {
  boxes: Map<string, Box>; // every element, "<list>:null", and "<code>:L<n>" for code lines
  kindOf: Map<string, Kind>; // element id -> its structure's kind
  structs: Map<string, Box>; // structure footprints
  text: Map<string, { x: number; y: number }>;
  size: { w: number; h: number }; // board grows to fit
}

type Rel = { size: { w: number; h: number }; boxes: Map<string, Box> }; // boxes relative to the structure's origin

/** Pure, deterministic. Structures flow left-to-right in rows; title on top, notes below everything. */
export function layout(scene: Scene): Layout {
  const elems = new Map<string, ElemItem>();
  for (const it of scene.items) if (it.kind === "elem" && !it.erasing) elems.set(it.id, it);

  const boxes = new Map<string, Box>(), kindOf = new Map<string, Kind>(), structs = new Map<string, Box>();
  let x = MARGIN_X, y = STRUCT_Y, rowH = 0, right = 0;

  for (const s of scene.structs) {
    const rel = s.kind === "tree" ? treeRel(s, elems) : s.kind === "code" ? codeRel(s) : kitRel(s);
    if (x > MARGIN_X && x - MARGIN_X + rel.size.w > MAX_ROW_W) {
      x = MARGIN_X;
      y += rowH + 30;
      rowH = 0;
    }
    for (const [id, b] of rel.boxes) boxes.set(id, { ...b, x: b.x + x, y: b.y + y });
    for (const id of s.elems) kindOf.set(id, s.kind);
    structs.set(s.id, { x, y, ...rel.size });
    right = Math.max(right, x + rel.size.w);
    x += rel.size.w + 60;
    rowH = Math.max(rowH, rel.size.h);
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

function kitRel(s: Struct): Rel {
  const n = s.elems.length, o = { x: 0, y: 0 }, boxes = new Map<string, Box>();
  s.elems.forEach((id, i) => boxes.set(id, elemBox(s.kind, i, n, o)));
  if (s.kind === "list") boxes.set(`${s.id}:null`, nullBox(n, o));
  return { size: structSize(s.kind, n), boxes };
}

/**
 * Tidy tree: binary nodes (children with a side) go in-order — left subtree, node, right subtree — so a BST reads
 * left-to-right in sorted order. n-ary nodes sit centred over their children. Depth sets the row.
 */
function treeRel(s: Struct, elems: Map<string, ElemItem>): Rel {
  const inTree = new Set(s.elems), kids = new Map<string, string[]>(), roots: string[] = [];
  for (const id of s.elems) {
    const p = elems.get(id)?.parent;
    if (p && inTree.has(p)) kids.set(p, [...(kids.get(p) ?? []), id]);
    else roots.push(id);
  }
  const col = new Map<string, number>(), depth = new Map<string, number>();
  let next = 0, maxD = 0;
  const walk = (id: string, d: number) => {
    depth.set(id, d);
    maxD = Math.max(maxD, d);
    const ch = kids.get(id) ?? [];
    if (ch.some((c) => elems.get(c)?.side)) {
      ch.filter((c) => elems.get(c)?.side === "left").forEach((c) => walk(c, d + 1));
      col.set(id, next++);
      ch.filter((c) => elems.get(c)?.side !== "left").forEach((c) => walk(c, d + 1));
    } else if (!ch.length) col.set(id, next++);
    else {
      ch.forEach((c) => walk(c, d + 1));
      col.set(id, ch.reduce((a, c) => a + col.get(c)!, 0) / ch.length);
    }
  };
  roots.forEach((r) => walk(r, 0));

  const boxes = new Map<string, Box>(), { w, h } = ELEM.tree;
  for (const id of s.elems) boxes.set(id, { x: 10 + col.get(id)! * TREE.dx, y: TOP_PAD + depth.get(id)! * TREE.dy, w, h });
  return { size: { w: Math.max(next, 1) * TREE.dx + 20, h: TOP_PAD + (maxD + 1) * TREE.dy + 40 }, boxes };
}

function codeRel(s: Struct): Rel {
  const lines = s.lines ?? [], boxes = new Map<string, Box>();
  const w = Math.min(CODE.maxW, Math.max(200, ...lines.map((l) => l.length * CODE.charW + 2 * CODE.pad)));
  lines.forEach((_, i) => boxes.set(`${s.id}:L${i + 1}`, { x: 0, y: TOP_PAD + i * CODE.lineH, w, h: CODE.lineH }));
  return { size: { w, h: TOP_PAD + lines.length * CODE.lineH + 20 }, boxes };
}
