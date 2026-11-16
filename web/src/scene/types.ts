/**
 * The board is data, not pixels. The tutor emits Ops; the reducer turns them into a Scene;
 * layout() decides where everything goes; the renderer animates it as hand strokes.
 * Ops never contain coordinates — the model says *what*, layout decides *where*.
 */
export type Point = { x: number; y: number };

export type Op =
  | { op: "list_new"; list: string; head?: boolean }
  | { op: "insert"; list: string; id: string; label: string; index?: number } // default: append
  | { op: "remove"; list: string; id: string }
  | { op: "reverse"; list: string }
  | { op: "connect"; id: string; from: string; to: string } // extra pointer between nodes
  | { op: "label"; id: string; target: string; text: string } // note under a node, follows it
  | { op: "highlight"; id: string; target: string }
  | { op: "write"; id: string; text: string; at?: "title" | "note" }
  | { op: "erase"; id: string }
  | { op: "clear" };

interface Base { id: string; erasing?: boolean; ghost?: Point } // ghost: frozen position while fading out
export type NodeItem = Base & { kind: "node"; label: string; bornAt: number };
export type ArrowItem = Base & { kind: "arrow"; from: string; to: string };
export type LabelItem = Base & { kind: "label"; target: string; text: string };
export type HighlightItem = Base & { kind: "highlight"; target: string };
export type TextItem = Base & { kind: "text"; text: string; at: "title" | "note" };
export type Item = NodeItem | ArrowItem | LabelItem | HighlightItem | TextItem;

export interface ListState { id: string; nodes: string[]; head: boolean }

export interface Scene {
  items: Item[]; // draw order
  lists: ListState[];
}

export const NODE = { w: 150, h: 70, split: 0.62 } as const;
export const NULL_BOX = { w: 70, h: 40 } as const;
export const SLIDE_MS = 450;
export const NODE_DRAW_MS = 1000;
