/**
 * The board is data, not pixels. The tutor (later: Muse Spark) emits Ops;
 * the reducer turns them into a Scene; the renderer animates each item as hand strokes.
 */
export type Point = { x: number; y: number };

export type Op =
  | { op: "add_node"; id: string; label: string; x: number; y: number }
  | { op: "connect"; id: string; from: string; to: string } // from node's next-pointer to node / null
  | { op: "add_null"; id: string; x: number; y: number }
  | { op: "write"; id: string; text: string; x: number; y: number; size?: number }
  | { op: "highlight"; id: string; target: string }
  | { op: "clear" };

export type NodeItem = { kind: "node"; id: string; label: string; x: number; y: number };
export type NullItem = { kind: "null"; id: string; x: number; y: number };
export type ArrowItem = { kind: "arrow"; id: string; from: string; to: string };
export type TextItem = { kind: "text"; id: string; text: string; x: number; y: number; size: number };
export type HighlightItem = { kind: "highlight"; id: string; target: string };

export type Item = NodeItem | NullItem | ArrowItem | TextItem | HighlightItem;

export interface Scene {
  items: Item[]; // draw order
}

/** Node geometry, shared by renderer and arrow routing. */
export const NODE = { w: 150, h: 70, split: 0.62 } as const;
export const NULL_BOX = { w: 70, h: 40 } as const;
