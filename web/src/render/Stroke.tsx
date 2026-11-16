import { useEffect, useState } from "react";
import { getStroke } from "perfect-freehand";
import type { Point } from "../scene/types";

/** Draws a freehand stroke progressively, like a pen moving along the points. */
export function Stroke({ points, delay = 0, duration = 500, size = 4, color = "var(--ink)" }: {
  points: Point[]; delay?: number; duration?: number; size?: number; color?: string;
}) {
  const [t, setT] = useState(0);

  useEffect(() => {
    let raf = 0;
    const start = performance.now() + delay;
    const tick = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - start) / duration));
      setT(easeInOut(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // animate once on mount; points are deterministic (seeded) so re-renders draw the same shape
  }, [delay, duration]);

  const n = Math.max(2, Math.ceil(points.length * t));
  if (t === 0) return null;
  const outline = getStroke(points.slice(0, n).map((p) => [p.x, p.y]), {
    size, thinning: 0.55, smoothing: 0.6, streamline: 0.4,
    simulatePressure: true, last: t === 1,
  });
  return <path d={toPath(outline)} fill={color} />;
}

const easeInOut = (p: number) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);

function toPath(pts: number[][]): string {
  if (pts.length < 4) return "";
  const avg = (a: number, b: number) => (a + b) / 2;
  let d = `M${pts[0][0]},${pts[0][1]} Q${pts[1][0]},${pts[1][1]} ${avg(pts[1][0], pts[2][0])},${avg(pts[1][1], pts[2][1])} T`;
  for (let i = 2; i < pts.length - 1; i++) d += `${avg(pts[i][0], pts[i + 1][0])},${avg(pts[i][1], pts[i + 1][1])} `;
  return d + "Z";
}
