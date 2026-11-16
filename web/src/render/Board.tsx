import { useMemo } from "react";
import { NODE, NULL_BOX, type Item, type NodeItem, type NullItem, type Point, type Scene } from "../scene/types";
import { arrow, box, line, loop, rng } from "./sketch";
import { Stroke } from "./Stroke";

export const BOARD = { w: 1200, h: 700 };

export function Board({ scene }: { scene: Scene }) {
  const byId = useMemo(() => new Map(scene.items.map((i) => [i.id, i])), [scene]);
  return (
    <svg className="paper" viewBox={`0 0 ${BOARD.w} ${BOARD.h}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" fill="none" stroke="var(--grid)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={BOARD.w} height={BOARD.h} fill="url(#grid)" />
      {scene.items.map((item) => <ItemView key={item.id + kindKey(item)} item={item} byId={byId} />)}
    </svg>
  );
}

// re-mount (re-animate) when an item's content changes
const kindKey = (i: Item) => (i.kind === "node" ? `${i.label}` : i.kind === "text" ? i.text : "");

function ItemView({ item, byId }: { item: Item; byId: Map<string, Item> }) {
  const rand = rng(item.id);
  switch (item.kind) {
    case "node": {
      const { x, y, label } = item;
      const sx = x + NODE.w * NODE.split;
      const dot = pointerOrigin(item);
      return (
        <g>
          <Stroke points={box(x, y, NODE.w, NODE.h, rand)} duration={600} />
          <Stroke points={line({ x: sx, y: y + 2 }, { x: sx, y: y + NODE.h - 2 }, rand)} delay={550} duration={200} />
          <Handwriting x={x + (NODE.w * NODE.split) / 2} y={y + NODE.h / 2} text={label} size={38} delay={700} />
          <circle cx={dot.x} cy={dot.y} r="5" fill="var(--ink)" className="pop" style={{ animationDelay: "950ms" }} />
        </g>
      );
    }
    case "null": {
      const { x, y } = item;
      return (
        <g>
          <Stroke points={box(x, y, NULL_BOX.w, NULL_BOX.h, rand)} duration={350} size={3} />
          <Handwriting x={x + NULL_BOX.w / 2} y={y + NULL_BOX.h / 2} text="null" size={26} delay={300} />
        </g>
      );
    }
    case "arrow": {
      const from = byId.get(item.from), to = byId.get(item.to);
      if (from?.kind !== "node" || !to || (to.kind !== "node" && to.kind !== "null")) return null;
      const a = pointerOrigin(from), b = inlet(to);
      const [shaft, h1, h2] = arrow({ x: a.x + 6, y: a.y }, { x: b.x - 6, y: b.y }, rand);
      return (
        <g>
          <Stroke points={shaft} duration={380} size={3.5} />
          <Stroke points={h1} delay={380} duration={90} size={3.5} />
          <Stroke points={h2} delay={470} duration={90} size={3.5} />
        </g>
      );
    }
    case "text":
      return <Handwriting x={item.x} y={item.y} text={item.text} size={item.size} anchor="start" />;
    case "highlight": {
      const t = byId.get(item.target);
      if (!t || (t.kind !== "node" && t.kind !== "null")) return null;
      const w = t.kind === "node" ? NODE.w : NULL_BOX.w, h = t.kind === "node" ? NODE.h : NULL_BOX.h;
      return <Stroke points={loop(t.x + w / 2, t.y + h / 2, w * 0.68, h * 0.95, rand)} duration={650} size={5} color="var(--marker)" />;
    }
  }
}

function pointerOrigin(n: NodeItem): Point {
  return { x: n.x + NODE.w * (NODE.split + (1 - NODE.split) / 2), y: n.y + NODE.h / 2 };
}
function inlet(n: NodeItem | NullItem): Point {
  return { x: n.x, y: n.y + (n.kind === "node" ? NODE.h : NULL_BOX.h) / 2 };
}

function Handwriting({ x, y, text, size, delay = 0, anchor = "middle" }: {
  x: number; y: number; text: string; size: number; delay?: number; anchor?: "start" | "middle";
}) {
  const ms = 200 + text.length * 45;
  return (
    <text x={x} y={y} fontSize={size} textAnchor={anchor} dominantBaseline="central" className="hand write-in"
      style={{ animationDelay: `${delay}ms`, animationDuration: `${ms}ms` }}>
      {text}
    </text>
  );
}
