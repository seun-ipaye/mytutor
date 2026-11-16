import type { Op } from "../scene/types";

/** Hardcoded until commit 6 — Muse Spark will produce op lists like this. Positions until commit 3's layout engine. */
export const linkedListDemo: Op[] = [
  { op: "write", id: "title", text: "A linked list is just nodes...", x: 120, y: 120 },
  { op: "add_node", id: "n1", label: "3", x: 120, y: 280 },
  { op: "add_node", id: "n2", label: "7", x: 400, y: 280 },
  { op: "connect", id: "e1", from: "n1", to: "n2" },
  { op: "add_node", id: "n3", label: "12", x: 680, y: 280 },
  { op: "connect", id: "e2", from: "n2", to: "n3" },
  { op: "add_null", id: "null", x: 960, y: 295 },
  { op: "connect", id: "e3", from: "n3", to: "null" },
  { op: "write", id: "head", text: "head", x: 150, y: 420, size: 30 },
  { op: "highlight", id: "hl1", target: "n1" },
  { op: "write", id: "note", text: "...each one points to the next", x: 120, y: 540 },
  { op: "highlight", id: "hl2", target: "null" },
];
