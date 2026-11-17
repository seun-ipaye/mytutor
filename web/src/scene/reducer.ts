import { layout } from "./layout";
import type { AnyOp, Box, Item, Op, Scene, Struct } from "./types";

export const emptyScene: Scene = { items: [], structs: [] };

/** Old list-only ops -> kit ops. */
export function normalize(raw: AnyOp): Op | null {
  const r = raw as Record<string, unknown> & { op: string };
  switch (r.op) {
    case "list_new": return { op: "new", id: String(r.list), kind: "list" };
    case "insert": return { op: "add", in: String(r.list), id: String(r.id), label: String(r.label), at: r.index as number | undefined };
    case "connect": return { op: "link", id: String(r.id), from: String(r.from), to: String(r.to) };
    case "remove": return r.list ? { op: "remove", id: String(r.id), in: String(r.list) } : (raw as Op);
    case "reverse": return r.list ? { op: "reverse", in: String(r.list) } : (raw as Op);
    default: return raw as Op;
  }
}

export function apply(prev: Scene, raw: AnyOp): Scene {
  const op = normalize(raw);
  if (!op) return prev;
  // anything that finished fading out on the previous op is gone now
  const scene: Scene = { items: prev.items.filter((i) => !i.erasing), structs: prev.structs };
  const owner = (id: string) => scene.structs.find((s) => s.elems.includes(id));
  const editStruct = (id: string | undefined, fn: (s: Struct) => Struct): Struct[] =>
    scene.structs.map((s) => (s.id === id ? fn(s) : s));

  switch (op.op) {
    case "clear":
      return emptyScene;

    case "new":
      if (scene.structs.some((s) => s.id === op.id)) return scene;
      return { ...scene, structs: [...scene.structs, { id: op.id, kind: op.kind, title: op.title, elems: [] }] };

    case "add": {
      const s = scene.structs.find((s) => s.id === op.in);
      if (!s || owner(op.id)) return scene;
      const structs = editStruct(s.id, (s) => {
        const elems = s.elems.slice();
        elems.splice(clamp(op.at ?? elems.length, 0, elems.length), 0, op.id);
        return { ...s, elems };
      });
      const tree = s.kind === "tree" ? { parent: op.parent, side: op.side } : {};
      return { structs, items: upsert(scene.items, { kind: "elem", id: op.id, label: String(op.label), struct: s.id, bornAt: performance.now(), ...tree }) };
    }

    case "code": {
      const panel: Struct = { id: op.id, kind: "code", title: op.title, elems: [], lines: op.lines.map(String) };
      const exists = scene.structs.some((s) => s.id === op.id);
      return { ...scene, structs: exists ? editStruct(op.id, () => panel) : [...scene.structs, panel] };
    }

    case "line":
      return { ...scene, structs: editStruct(op.in, (s) => ({ ...s, cursor: op.n ?? undefined })) };

    case "remove":
    case "erase": {
      const { boxes } = layout(scene);
      const s = owner(op.id);
      // removing a tree node takes its whole subtree with it
      const gone = s?.kind === "tree" ? subtree(scene.items, op.id) : [op.id];
      const structs = s ? editStruct(s.id, (s) => ({ ...s, elems: s.elems.filter((e) => !gone.includes(e)) })) : scene.structs;
      let items = scene.items;
      for (const id of gone) items = eraseCascade(items, id, boxes.get(id));
      return { structs, items };
    }

    case "set":
      return { ...scene, items: scene.items.map((it) => (it.kind === "elem" && it.id === op.id ? { ...it, label: String(op.label) } : it)) };

    case "swap": {
      const s = op.in ? scene.structs.find((s) => s.id === op.in) : owner(op.a);
      if (!s) return scene;
      if (s.kind === "tree") {
        // trees: swap the values (heap sift-up/down), the shape stays
        const la = labelOf(scene.items, op.a), lb = labelOf(scene.items, op.b);
        if (la === undefined || lb === undefined) return scene;
        return { ...scene, items: scene.items.map((it) => (it.kind !== "elem" ? it : it.id === op.a ? { ...it, label: lb } : it.id === op.b ? { ...it, label: la } : it)) };
      }
      return {
        ...scene,
        structs: editStruct(s.id, (s) => {
          const elems = s.elems.slice(), i = elems.indexOf(op.a), j = elems.indexOf(op.b);
          if (i < 0 || j < 0) return s;
          [elems[i], elems[j]] = [elems[j], elems[i]];
          return { ...s, elems };
        }),
      };
    }

    case "reverse":
      return { ...scene, structs: editStruct(op.in, (s) => ({ ...s, elems: s.elems.slice().reverse() })) };

    case "pointer":
      if (!op.target) return { ...scene, items: eraseCascade(scene.items, op.id) };
      return { ...scene, items: upsert(scene.items, { kind: "pointer", id: op.id, target: op.target, name: op.name ?? op.id }) };

    case "link":
      return { ...scene, items: upsert(scene.items, { kind: "arrow", id: op.id, from: op.from, to: op.to }) };
    case "label":
      return { ...scene, items: upsert(scene.items, { kind: "label", id: op.id, target: op.target, text: op.text }) };
    case "highlight":
      return { ...scene, items: upsert(scene.items, { kind: "highlight", id: op.id, target: op.target }) };
    case "write":
      return { ...scene, items: upsert(scene.items, { kind: "text", id: op.id, text: op.text, at: op.at ?? "note" }) };
  }
}

const labelOf = (items: Item[], id: string) => {
  const it = items.find((i) => i.id === id);
  return it?.kind === "elem" ? it.label : undefined;
};

function subtree(items: Item[], root: string): string[] {
  const out = [root];
  for (let i = 0; i < out.length; i++)
    for (const it of items) if (it.kind === "elem" && it.parent === out[i] && !out.includes(it.id)) out.push(it.id);
  return out;
}

/** Fade out an item plus anything attached to it (labels, highlights, pointers, arrows). */
function eraseCascade(items: Item[], id: string, ghost?: Box): Item[] {
  return items.map((it) => {
    if (it.id === id) return { ...it, erasing: true, ghost };
    const attached =
      ((it.kind === "label" || it.kind === "highlight" || it.kind === "pointer") && it.target === id) ||
      (it.kind === "arrow" && (it.from === id || it.to === id));
    return attached ? { ...it, erasing: true } : it;
  });
}

function upsert(items: Item[], item: Item): Item[] {
  const i = items.findIndex((it) => it.id === item.id);
  if (i === -1) return [...items, item];
  const next = items.slice();
  next[i] = { ...item, ...(item.kind === "elem" && items[i].kind === "elem" ? { bornAt: (items[i] as typeof item).bornAt } : {}) };
  return next;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** How long an op takes on screen — the player waits this long before the next op. */
export function drawDuration(raw: AnyOp): number {
  const op = normalize(raw);
  if (!op) return 0;
  switch (op.op) {
    case "new": return 450;
    case "code": return 300 + op.lines.length * 140;
    case "line": return 400;
    case "add": return 950;
    case "remove": return 900;
    case "set": return 650;
    case "swap": return 800;
    case "reverse": return 1000;
    case "pointer": return 550;
    case "link": return 600;
    case "label": case "write": return 250 + op.text.length * 45;
    case "highlight": return 700;
    case "erase": return 450;
    case "clear": return 0;
  }
}
