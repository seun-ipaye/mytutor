import { useMemo } from "react";
import { ELEM, stackWalls, TOP_PAD } from "../scene/kits";
import { layout } from "../scene/layout";
import { ELEM_DRAW_MS, SLIDE_MS, type Box, type ElemItem, type Item, type Kind, type Point, type Scene, type Struct } from "../scene/types";
import { arrow, box, line, loop, rng } from "./sketch";
import { Stroke } from "./Stroke";

export function Board({ scene }: { scene: Scene }) {
  const L = useMemo(() => layout(scene), [scene]);
  const byId = useMemo(() => new Map(scene.items.map((i) => [i.id, i])), [scene]);
  const boxOf = (id: string): Box | undefined => byId.get(id)?.ghost ?? L.boxes.get(id);
  const now = performance.now();
  // arrows/markers wait for slides to finish and for brand-new elements to be drawn
  const settle = (...ids: string[]) =>
    Math.max(SLIDE_MS, ...ids.map((id) => {
      const it = byId.get(id);
      return it?.kind === "elem" ? it.bornAt + ELEM_DRAW_MS - now : 0;
    }));
  // pointers sharing a target spread out side by side
  const pointerSlot = useMemo(() => {
    const groups = new Map<string, string[]>(), slot = new Map<string, [number, number]>();
    for (const it of scene.items) if (it.kind === "pointer" && !it.erasing) groups.set(it.target, [...(groups.get(it.target) ?? []), it.id]);
    groups.forEach((ids) => ids.forEach((id, k) => slot.set(id, [k, ids.length])));
    return slot;
  }, [scene]);

  return (
    <svg className="paper" viewBox={`0 0 ${L.size.w} ${L.size.h}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" fill="none" stroke="var(--grid)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={L.size.w} height={L.size.h} fill="url(#grid)" />

      {scene.structs.map((s) => <StructFrame key={s.id} s={s} at={L.structs.get(s.id)!} boxes={L.boxes} settle={settle} />)}

      {scene.items.map((it) => {
        const cls = it.erasing ? "erasing" : undefined;
        switch (it.kind) {
          case "elem": {
            const b = boxOf(it.id), kind = L.kindOf.get(it.id) ?? kindOfStruct(scene, it);
            return b && <Placed key={it.id} at={b} className={cls}><ElemView item={it} kind={kind} /></Placed>;
          }
          case "label": {
            const b = boxOf(it.target), kind = L.kindOf.get(it.target);
            if (!b) return null;
            const side = kind === "stack" ? { x: b.w + 18, y: b.h / 2, a: "start" as const } : { x: b.w / 2, y: -26, a: "middle" as const };
            return (
              <Placed key={it.id + it.text} at={b} className={cls}>
                <Handwriting x={side.x} y={side.y} text={it.text} size={26} anchor={side.a} />
              </Placed>
            );
          }
          case "highlight": {
            const b = boxOf(it.target);
            return b && (
              <Placed key={it.id + it.target} at={b} className={cls}>
                <Stroke points={loop(b.w / 2, b.h / 2, b.w * 0.68 + 8, b.h * 0.8 + 6, rng(it.id))} duration={650} size={5} color="var(--marker)" />
              </Placed>
            );
          }
          case "pointer": {
            const b = boxOf(it.target), kind = L.kindOf.get(it.target);
            if (!b) return null;
            const [k, m] = pointerSlot.get(it.id) ?? [0, 1];
            const at: Point = kind === "stack"
              ? { x: b.x + b.w + 14, y: b.y + b.h / 2 + (k - (m - 1) / 2) * 20 }
              : { x: b.x + b.w / 2 + (k - (m - 1) / 2) * 30, y: b.y + b.h + (kind === "array" ? 34 : 14) };
            return <Placed key={it.id} at={at} className={cls}><PointerMark name={it.name} side={kind === "stack" ? "right" : "below"} id={it.id} /></Placed>;
          }
          case "arrow": {
            const a = boxOf(it.from), b = boxOf(it.to);
            if (!a || !b) return null;
            const key = `${it.id}@${Math.round(a.x)},${Math.round(a.y)},${Math.round(b.x)},${Math.round(b.y)}`;
            const p = edgePoint(a, center(b)), q = edgePoint(b, center(a));
            return <g key={key} className={cls}><Arrow seed={key} from={p} to={q} delay={settle(it.from, it.to)} /></g>;
          }
          case "text": {
            const at = L.text.get(it.id);
            return at && <g key={it.id + it.text} className={cls}><Handwriting x={at.x} y={at.y} text={it.text} size={it.at === "title" ? 38 : 32} anchor="start" /></g>;
          }
        }
      })}
    </svg>
  );
}

const kindOfStruct = (scene: Scene, it: ElemItem): Kind => scene.structs.find((s) => s.id === it.struct)?.kind ?? "list";

/** Structure-level drawing: titles, list arrows/null/head, array indices, stack walls/top. */
function StructFrame({ s, at, boxes, settle }: {
  s: Struct; at: Box; boxes: Map<string, Box>; settle: (...ids: string[]) => number;
}) {
  const n = s.elems.length;
  const title = s.title && <Handwriting x={at.x} y={at.y + 16} text={s.title} size={28} anchor="start" muted />;

  if (s.kind === "list") {
    const nullId = `${s.id}:null`, chain = [...s.elems, nullId];
    return (
      <g>
        {title}
        <Placed key={nullId} at={boxes.get(nullId)!}><NullBox id={nullId} /></Placed>
        {s.elems.slice(0, 1).map((first) => (
          <Placed key={`head@${first}`} at={boxes.get(first)!}>
            <Handwriting x={(ELEM.list.w * 0.62) / 2} y={ELEM.list.h + 36} text="head" size={30} delay={settle(first)} />
          </Placed>
        ))}
        {chain.slice(0, -1).map((from, i) => {
          const to = chain[i + 1], a = boxes.get(from)!, b = boxes.get(to)!;
          const key = `${from}>${to}@${Math.round(a.x)},${Math.round(b.x)}`;
          const origin = { x: a.x + a.w * 0.81, y: a.y + a.h / 2 }, inlet = { x: b.x, y: b.y + b.h / 2 };
          return <Arrow key={key} seed={key} from={{ x: origin.x + 6, y: origin.y }} to={{ x: inlet.x - 6, y: inlet.y }} delay={settle(from, to)} />;
        })}
      </g>
    );
  }

  if (s.kind === "array") {
    const y = at.y + TOP_PAD + ELEM.array.h + 18;
    return (
      <g>
        {title}
        {s.elems.map((_, i) => (
          <Handwriting key={`${s.id}#${i}`} x={at.x + i * ELEM.array.w + ELEM.array.w / 2} y={y} text={String(i)} size={20} muted delay={300} />
        ))}
      </g>
    );
  }

  // stack
  const w = stackWalls(n, at), rand = rng(`${s.id}:walls:${w.bottom}`), top = s.elems[n - 1];
  const topBox = top ? boxes.get(top) : undefined;
  return (
    <g>
      {title}
      <g key={`walls@${w.bottom}`}>
        <Stroke points={[...line({ x: w.l, y: w.top }, { x: w.l, y: w.bottom }, rand), ...line({ x: w.l, y: w.bottom }, { x: w.r, y: w.bottom }, rand).slice(1), ...line({ x: w.r, y: w.bottom }, { x: w.r, y: w.top }, rand).slice(1)]} duration={450} size={3.5} />
      </g>
      {topBox && (
        <g key={`top@${top}`} className="placed" style={{ transform: `translate(${w.l - 74}px, ${topBox.y + topBox.h / 2}px)` }}>
          <Handwriting x={0} y={0} text="top" size={26} anchor="start" delay={settle(top)} />
          <Arrow seed={`top${top}`} from={{ x: 40, y: 0 }} to={{ x: 66, y: 0 }} delay={settle(top) + 200} />
        </g>
      )}
    </g>
  );
}

/** Positions a group; CSS transitions the transform so moved things slide. */
function Placed({ at, children, className }: { at: Point; children: React.ReactNode; className?: string }) {
  return <g className={`placed ${className ?? ""}`} style={{ transform: `translate(${at.x}px, ${at.y}px)` }}>{children}</g>;
}

function ElemView({ item, kind }: { item: ElemItem; kind: Kind }) {
  const rand = rng(item.id), { w, h } = ELEM[kind];
  if (kind === "list") {
    const sx = w * 0.62;
    return (
      <g>
        <Stroke points={box(0, 0, w, h, rand)} duration={600} />
        <Stroke points={line({ x: sx, y: 2 }, { x: sx, y: h - 2 }, rand)} delay={550} duration={200} />
        <Handwriting key={item.label} x={sx / 2} y={h / 2} text={item.label} size={38} delay={700} />
        <circle cx={sx + (w - sx) / 2} cy={h / 2} r="5" fill="var(--ink)" className="pop" style={{ animationDelay: "950ms" }} />
      </g>
    );
  }
  return (
    <g>
      <Stroke points={box(0, 0, w, h, rand)} duration={kind === "array" ? 350 : 450} />
      <Handwriting key={item.label} x={w / 2} y={h / 2} text={item.label} size={kind === "array" ? 32 : 30} delay={kind === "array" ? 320 : 420} />
    </g>
  );
}

function NullBox({ id }: { id: string }) {
  return (
    <g>
      <Stroke points={box(0, 0, 70, 40, rng(id))} duration={350} size={3} />
      <Handwriting x={35} y={20} text="null" size={26} delay={300} />
    </g>
  );
}

/** A named marker (i, j, curr…) — an arrow pointing at its element plus the name. Slides when retargeted. */
function PointerMark({ name, side, id }: { name: string; side: "below" | "right"; id: string }) {
  const rand = rng(`ptr:${id}`);
  const [from, to, tx, ty, anchor] = side === "below"
    ? [{ x: 0, y: 34 }, { x: 0, y: 4 }, 0, 50, "middle" as const]
    : [{ x: 34, y: 0 }, { x: 4, y: 0 }, 40, 0, "start" as const];
  const [shaft, h1, h2] = arrow(from, to, rand);
  return (
    <g>
      <Stroke points={shaft} duration={220} size={3} color="var(--pointer)" />
      <Stroke points={h1} delay={220} duration={70} size={3} color="var(--pointer)" />
      <Stroke points={h2} delay={290} duration={70} size={3} color="var(--pointer)" />
      <Handwriting x={tx} y={ty} text={name} size={26} anchor={anchor} delay={250} color="var(--pointer)" />
    </g>
  );
}

function Arrow({ seed, from, to, delay }: { seed: string; from: Point; to: Point; delay: number }) {
  const [shaft, h1, h2] = arrow(from, to, rng(seed));
  return (
    <g>
      <Stroke points={shaft} delay={delay} duration={380} size={3.5} />
      <Stroke points={h1} delay={delay + 380} duration={90} size={3.5} />
      <Stroke points={h2} delay={delay + 470} duration={90} size={3.5} />
    </g>
  );
}

const center = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
/** Where the line from a box's center toward `p` leaves the box (plus a small gap). */
function edgePoint(b: Box, p: Point): Point {
  const c = center(b), dx = p.x - c.x, dy = p.y - c.y;
  const s = Math.min(dx ? (b.w / 2 + 6) / Math.abs(dx) : Infinity, dy ? (b.h / 2 + 6) / Math.abs(dy) : Infinity);
  return { x: c.x + dx * s, y: c.y + dy * s };
}

function Handwriting({ x, y, text, size, delay = 0, anchor = "middle", muted, color }: {
  x: number; y: number; text: string; size: number; delay?: number; anchor?: "start" | "middle"; muted?: boolean; color?: string;
}) {
  return (
    <text x={x} y={y} fontSize={size} textAnchor={anchor} dominantBaseline="central" className={`hand write-in ${muted ? "muted" : ""}`}
      style={{ animationDelay: `${delay}ms`, animationDuration: `${200 + text.length * 45}ms`, ...(color ? { fill: color } : {}) }}>
      {text}
    </text>
  );
}

export type { Item };
