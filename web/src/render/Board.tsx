import { useMemo } from "react";
import { BOARD, layout } from "../scene/layout";
import { NODE, NODE_DRAW_MS, NULL_BOX, SLIDE_MS, type Item, type NodeItem, type Point, type Scene } from "../scene/types";
import { arrow, box, line, loop, rng } from "./sketch";
import { Stroke } from "./Stroke";

export { BOARD };

export function Board({ scene }: { scene: Scene }) {
  const { pos, nullOf } = useMemo(() => layout(scene), [scene]);
  const byId = useMemo(() => new Map(scene.items.map((i) => [i.id, i])), [scene]);
  const where = (id: string) => byId.get(id)?.ghost ?? pos.get(id);
  const now = performance.now();
  // arrows wait for slides to finish and for brand-new nodes to be drawn
  const settleDelay = (...ids: string[]) =>
    Math.max(SLIDE_MS, ...ids.map((id) => {
      const it = byId.get(id);
      return it?.kind === "node" ? it.bornAt + NODE_DRAW_MS - now : 0;
    }));

  return (
    <svg className="paper" viewBox={`0 0 ${BOARD.w} ${BOARD.h}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" fill="none" stroke="var(--grid)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={BOARD.w} height={BOARD.h} fill="url(#grid)" />

      {scene.lists.map((list) => {
        const nullId = nullOf.get(list.id)!;
        const chain = [...list.nodes, nullId];
        return (
          <g key={list.id}>
            <Placed key={nullId} at={pos.get(nullId)!}><NullBox id={nullId} /></Placed>
            {list.nodes.slice(0, 1).map((first) =>
              list.head ? (
                <Placed key={`head@${first}`} at={pos.get(first)!}>
                  <Handwriting x={(NODE.w * NODE.split) / 2} y={NODE.h + 36} text="head" size={30} delay={settleDelay(first)} />
                </Placed>
              ) : null)}
            {chain.slice(0, -1).map((from, i) => {
              const to = chain[i + 1], a = pos.get(from)!, b = pos.get(to)!;
              // keyed on endpoints + positions: any change erases and redraws the arrow
              const key = `${from}>${to}@${Math.round(a.x)},${Math.round(b.x)}`;
              return <PointerArrow key={key} seed={key} from={pointerOrigin(a)} to={inlet(b, to === nullId)} delay={settleDelay(from, to)} />;
            })}
          </g>
        );
      })}

      {scene.items.map((it) => {
        const cls = it.erasing ? "erasing" : undefined;
        switch (it.kind) {
          case "node": {
            const at = where(it.id);
            return at && <Placed key={it.id} at={at} className={cls}><NodeBox node={it} /></Placed>;
          }
          case "label": {
            const at = where(it.target);
            return at && (
              <Placed key={it.id + it.text} at={at} className={cls}>
                <Handwriting x={(NODE.w * NODE.split) / 2} y={-28} text={it.text} size={28} />
              </Placed>
            );
          }
          case "highlight": {
            const at = where(it.target), isNull = it.target.endsWith(":null");
            const w = isNull ? NULL_BOX.w : NODE.w, h = isNull ? NULL_BOX.h : NODE.h;
            return at && (
              <Placed key={it.id + it.target} at={at} className={cls}>
                <Stroke points={loop(w / 2, h / 2, w * 0.68, h * 0.95, rng(it.id))} duration={650} size={5} color="var(--marker)" />
              </Placed>
            );
          }
          case "arrow": {
            const a = where(it.from), b = where(it.to);
            if (!a || !b) return null;
            const key = `${it.id}@${Math.round(a.x)},${Math.round(b.x)}`;
            return <g key={key} className={cls}><PointerArrow seed={key} from={pointerOrigin(a)} to={inlet(b, it.to.endsWith(":null"))} delay={settleDelay(it.from, it.to)} /></g>;
          }
          case "text": {
            const at = pos.get(it.id);
            return at && <g key={it.id + it.text} className={cls}><Handwriting x={at.x} y={at.y} text={it.text} size={it.at === "title" ? 38 : 32} anchor="start" /></g>;
          }
        }
      })}
    </svg>
  );
}

/** Positions a group; CSS transitions the transform so moved nodes slide. */
function Placed({ at, children, className }: { at: Point; children: React.ReactNode; className?: string }) {
  return <g className={`placed ${className ?? ""}`} style={{ transform: `translate(${at.x}px, ${at.y}px)` }}>{children}</g>;
}

function NodeBox({ node }: { node: NodeItem }) {
  const rand = rng(node.id), sx = NODE.w * NODE.split;
  return (
    <g>
      <Stroke points={box(0, 0, NODE.w, NODE.h, rand)} duration={600} />
      <Stroke points={line({ x: sx, y: 2 }, { x: sx, y: NODE.h - 2 }, rand)} delay={550} duration={200} />
      <Handwriting x={sx / 2} y={NODE.h / 2} text={node.label} size={38} delay={700} />
      <circle cx={sx + (NODE.w - sx) / 2} cy={NODE.h / 2} r="5" fill="var(--ink)" className="pop" style={{ animationDelay: "950ms" }} />
    </g>
  );
}

function NullBox({ id }: { id: string }) {
  return (
    <g>
      <Stroke points={box(0, 0, NULL_BOX.w, NULL_BOX.h, rng(id))} duration={350} size={3} />
      <Handwriting x={NULL_BOX.w / 2} y={NULL_BOX.h / 2} text="null" size={26} delay={300} />
    </g>
  );
}

function PointerArrow({ seed, from, to, delay }: { seed: string; from: Point; to: Point; delay: number }) {
  const [shaft, h1, h2] = arrow({ x: from.x + 6, y: from.y }, { x: to.x - 6, y: to.y }, rng(seed));
  return (
    <g>
      <Stroke points={shaft} delay={delay} duration={380} size={3.5} />
      <Stroke points={h1} delay={delay + 380} duration={90} size={3.5} />
      <Stroke points={h2} delay={delay + 470} duration={90} size={3.5} />
    </g>
  );
}

const pointerOrigin = (n: Point): Point => ({ x: n.x + NODE.w * (NODE.split + (1 - NODE.split) / 2), y: n.y + NODE.h / 2 });
const inlet = (n: Point, isNull: boolean): Point => ({ x: n.x, y: n.y + (isNull ? NULL_BOX.h : NODE.h) / 2 });

function Handwriting({ x, y, text, size, delay = 0, anchor = "middle" }: {
  x: number; y: number; text: string; size: number; delay?: number; anchor?: "start" | "middle";
}) {
  return (
    <text x={x} y={y} fontSize={size} textAnchor={anchor} dominantBaseline="central" className="hand write-in"
      style={{ animationDelay: `${delay}ms`, animationDuration: `${200 + text.length * 45}ms` }}>
      {text}
    </text>
  );
}

export type { Item };
