import type { Op } from "../scene/types";

/** Hardcoded until commit 6 — Muse Spark will produce op lists like this. No coordinates anywhere. */
export const linkedListDemo: Op[] = [
  { op: "write", id: "title", text: "A linked list is just nodes...", at: "title" },
  { op: "list_new", list: "L" },
  { op: "insert", list: "L", id: "n1", label: "3" },
  { op: "insert", list: "L", id: "n2", label: "7" },
  { op: "insert", list: "L", id: "n3", label: "12" },
  { op: "highlight", id: "hl1", target: "n1" },
  { op: "write", id: "note", text: "...each one points to the next", at: "note" },
  { op: "highlight", id: "hl2", target: "L:null" },
];
