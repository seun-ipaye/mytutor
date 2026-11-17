/**
 * The board is data, not pixels. The tutor emits Ops; the reducer turns them into a Scene;
 * layout() decides where everything goes (per-kit layouts + region flow); the renderer animates it as hand strokes.
 * Ops never contain coordinates — the model says *what*, layout decides *where*.
 */
export type Point = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };

/** Structure kits. Each has its own layout + look; all share the same ops. */
export type Kind = "list" | "array" | "stack";

export type Op =
  | { op: "new"; id: string; kind: Kind; title?: string }
  | { op: "add"; in: string; id: string; label: string; at?: number } // default: end (stack: push)
  | { op: "remove"; id: string; in?: string }
  | { op: "set"; id: string; label: string } // change an element's value
  | { op: "swap"; a: string; b: string; in?: string }
  | { op: "reverse"; in: string }
  | { op: "pointer"; id: string; target: string | null; name?: string } // named marker (i, j, curr...); null target removes it
  | { op: "link"; id: string; from: string; to: string } // extra arrow between elements
  | { op: "label"; id: string; target: string; text: string }
  | { op: "highlight"; id: string; target: string }
  | { op: "write"; id: string; text: string; at?: "title" | "note" }
  | { op: "erase"; id: string }
  | { op: "clear" };

/** Pre-kit ops (commit 3–7, scripted lesson) — normalized into the ops above. */
export type LegacyOp =
  | { op: "list_new"; list: string; head?: boolean }
  | { op: "insert"; list: string; id: string; label: string; index?: number }
  | { op: "remove"; list: string; id: string }
  | { op: "reverse"; list: string }
  | { op: "connect"; id: string; from: string; to: string };

export type AnyOp = Op | LegacyOp;

interface Base { id: string; erasing?: boolean; ghost?: Box } // ghost: frozen box while fading out
export type ElemItem = Base & { kind: "elem"; label: string; struct: string; bornAt: number };
export type ArrowItem = Base & { kind: "arrow"; from: string; to: string };
export type LabelItem = Base & { kind: "label"; target: string; text: string };
export type HighlightItem = Base & { kind: "highlight"; target: string };
export type PointerItem = Base & { kind: "pointer"; target: string; name: string };
export type TextItem = Base & { kind: "text"; text: string; at: "title" | "note" };
export type Item = ElemItem | ArrowItem | LabelItem | HighlightItem | PointerItem | TextItem;

export interface Struct { id: string; kind: Kind; title?: string; elems: string[] }

export interface Scene {
  items: Item[]; // draw order
  structs: Struct[];
}

export const SLIDE_MS = 450;
export const ELEM_DRAW_MS = 1000;
