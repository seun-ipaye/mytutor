import type { ElemItem, Item, Scene } from "../scene/types";

/** Plain-text board snapshot for the model, so an interruption answer can build on what's drawn. */
export function describeScene(scene: Scene): string {
  const live = scene.items.filter((i) => !i.erasing);
  const elem = new Map(live.filter((i): i is ElemItem => i.kind === "elem").map((e) => [e.id, e]));
  const out: string[] = [];

  for (const s of scene.structs) {
    const head = `${s.kind} "${s.id}"${s.title ? ` titled "${s.title}"` : ""}`;
    if (s.kind === "code") {
      out.push(`${head}: ${(s.lines ?? []).map((l, i) => `L${i + 1}: ${l}`).join(" | ")}${s.cursor ? ` (cursor on L${s.cursor})` : ""}`);
      continue;
    }
    const parts = s.elems.map((id) => {
      const e = elem.get(id);
      const rel = s.kind === "tree" && e?.parent ? ` <${e.side ?? "child"} of ${e.parent}>` : "";
      return `${id}=${e?.label ?? "?"}${rel}`;
    });
    const order = s.kind === "stack" ? " (bottom -> top)" : s.kind === "list" ? " (head -> tail, ends in null)" : "";
    out.push(`${head}${order}: ${parts.join(", ") || "(empty)"}`);
  }

  const by = (k: Item["kind"]) => live.filter((i) => i.kind === k);
  const pointers = by("pointer").map((p) => p.kind === "pointer" && `${p.id}->${p.target}`).filter(Boolean);
  if (pointers.length) out.push(`pointers: ${pointers.join(", ")}`);
  const marks = by("highlight").map((h) => h.kind === "highlight" && `${h.id} circles ${h.target}`).filter(Boolean);
  if (marks.length) out.push(`highlights: ${marks.join(", ")}`);
  const labels = by("label").map((l) => l.kind === "label" && `${l.id} on ${l.target}: "${l.text}"`).filter(Boolean);
  if (labels.length) out.push(`labels: ${labels.join(", ")}`);
  const links = by("arrow").map((a) => a.kind === "arrow" && `${a.id}: ${a.from}->${a.to}`).filter(Boolean);
  if (links.length) out.push(`extra arrows: ${links.join(", ")}`);
  const text = by("text").map((t) => t.kind === "text" && `${t.id} (${t.at}): "${t.text}"`).filter(Boolean);
  if (text.length) out.push(`writing: ${text.join(", ")}`);
  return out.join("\n");
}
