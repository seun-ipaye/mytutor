import type { Op, Scene } from "./types";

export const emptyScene: Scene = { items: [] };

export function apply(scene: Scene, op: Op): Scene {
  switch (op.op) {
    case "clear":
      return emptyScene;
    case "add_node":
      return push(scene, { kind: "node", id: op.id, label: op.label, x: op.x, y: op.y });
    case "add_null":
      return push(scene, { kind: "null", id: op.id, x: op.x, y: op.y });
    case "connect":
      return push(scene, { kind: "arrow", id: op.id, from: op.from, to: op.to });
    case "write":
      return push(scene, { kind: "text", id: op.id, text: op.text, x: op.x, y: op.y, size: op.size ?? 34 });
    case "highlight":
      return push(scene, { kind: "highlight", id: op.id, target: op.target });
  }
}

function push(scene: Scene, item: Scene["items"][number]): Scene {
  // same id replaces in place (redraws), otherwise append
  const i = scene.items.findIndex((it) => it.id === item.id);
  if (i === -1) return { items: [...scene.items, item] };
  const items = scene.items.slice();
  items[i] = item;
  return { items };
}

/** How long an op takes to draw — the player waits this long before the next op. */
export function drawDuration(op: Op): number {
  switch (op.op) {
    case "add_node": return 1100;
    case "add_null": return 600;
    case "connect": return 550;
    case "write": return 250 + op.text.length * 45;
    case "highlight": return 700;
    case "clear": return 0;
  }
}
