import { layout } from "./layout";
import type { Item, Op, Scene } from "./types";

export const emptyScene: Scene = { items: [], lists: [] };

export function apply(prev: Scene, op: Op): Scene {
  // anything that finished fading out on the previous op is gone now
  const scene: Scene = { items: prev.items.filter((i) => !i.erasing), lists: prev.lists };

  switch (op.op) {
    case "clear":
      return emptyScene;

    case "list_new":
      if (scene.lists.some((l) => l.id === op.list)) return scene;
      return { ...scene, lists: [...scene.lists, { id: op.list, nodes: [], head: op.head ?? true }] };

    case "insert": {
      const lists = scene.lists.map((l) => {
        if (l.id !== op.list || l.nodes.includes(op.id)) return l;
        const nodes = l.nodes.slice();
        nodes.splice(clamp(op.index ?? nodes.length, 0, nodes.length), 0, op.id);
        return { ...l, nodes };
      });
      return { lists, items: upsert(scene.items, { kind: "node", id: op.id, label: op.label, bornAt: performance.now() }) };
    }

    case "remove": {
      const { pos } = layout(scene);
      const lists = scene.lists.map((l) => (l.id === op.list ? { ...l, nodes: l.nodes.filter((n) => n !== op.id) } : l));
      return { lists, items: eraseCascade(scene.items, op.id, pos.get(op.id)) };
    }

    case "reverse":
      return { ...scene, lists: scene.lists.map((l) => (l.id === op.list ? { ...l, nodes: l.nodes.slice().reverse() } : l)) };

    case "connect":
      return { ...scene, items: upsert(scene.items, { kind: "arrow", id: op.id, from: op.from, to: op.to }) };
    case "label":
      return { ...scene, items: upsert(scene.items, { kind: "label", id: op.id, target: op.target, text: op.text }) };
    case "highlight":
      return { ...scene, items: upsert(scene.items, { kind: "highlight", id: op.id, target: op.target }) };
    case "write":
      return { ...scene, items: upsert(scene.items, { kind: "text", id: op.id, text: op.text, at: op.at ?? "note" }) };

    case "erase": {
      const { pos } = layout(scene);
      const lists = scene.lists.map((l) => ({ ...l, nodes: l.nodes.filter((n) => n !== op.id) }));
      return { lists, items: eraseCascade(scene.items, op.id, pos.get(op.id)) };
    }
  }
}

/** Fade out an item plus anything attached to it (its labels, highlights, extra arrows). */
function eraseCascade(items: Item[], id: string, ghost?: { x: number; y: number }): Item[] {
  return items.map((it) => {
    if (it.id === id) return { ...it, erasing: true, ghost };
    const attached =
      ((it.kind === "label" || it.kind === "highlight") && it.target === id) ||
      (it.kind === "arrow" && (it.from === id || it.to === id));
    return attached ? { ...it, erasing: true } : it;
  });
}

function upsert(items: Item[], item: Item): Item[] {
  const i = items.findIndex((it) => it.id === item.id);
  if (i === -1) return [...items, item];
  const next = items.slice();
  next[i] = item;
  return next;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** How long an op takes on screen — the player waits this long before the next op. */
export function drawDuration(op: Op): number {
  switch (op.op) {
    case "insert": return 1150;
    case "remove": return 900;
    case "reverse": return 1000;
    case "connect": return 600;
    case "label": return 250 + op.text.length * 45;
    case "write": return 250 + op.text.length * 45;
    case "highlight": return 700;
    case "erase": return 450;
    case "list_new": case "clear": return 0;
  }
}
