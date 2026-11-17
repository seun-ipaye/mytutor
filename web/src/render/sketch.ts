import type { Point } from "../scene/types";

/** Seeded RNG so a given item always wobbles the same way (no jitter on re-render). */
export function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** A slightly wavy hand-drawn line from a to b. */
export function line(a: Point, b: Point, rand: () => number, wobble = 1.6): Point[] {
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.max(6, Math.round(len / 8));
  const nx = -(b.y - a.y) / (len || 1), ny = (b.x - a.x) / (len || 1);
  const phase = rand() * Math.PI * 2, amp = wobble * (0.5 + rand());
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const off = Math.sin(t * Math.PI + phase) * amp * Math.sin(t * Math.PI);
    pts.push({ x: a.x + (b.x - a.x) * t + nx * off, y: a.y + (b.y - a.y) * t + ny * off });
  }
  return pts;
}

/** Box drawn as one continuous stroke, corners slightly overshooting like a real pen. */
export function box(x: number, y: number, w: number, h: number, rand: () => number): Point[] {
  const j = () => (rand() - 0.5) * 4;
  const c = [
    { x: x + j(), y: y + j() },
    { x: x + w + j(), y: y + j() },
    { x: x + w + j(), y: y + h + j() },
    { x: x + j(), y: y + h + j() },
    { x: x + j() + 6, y: y + j() - 2 }, // overshoot past the start
  ];
  return c.slice(1).flatMap((p, i) => line(c[i], p, rand).slice(i ? 1 : 0));
}

/** Loose ellipse that goes a bit more than once around — a "circling" gesture. */
export function loop(cx: number, cy: number, rx: number, ry: number, rand: () => number, turns = 1.12): Point[] {
  const start = rand() * Math.PI * 2, n = 48;
  const pts: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const a = start + (i / n) * turns * Math.PI * 2;
    const r = 1 + Math.sin(a * 2 + start) * 0.05 + (i / n) * 0.06;
    pts.push({ x: cx + Math.cos(a) * rx * r, y: cy + Math.sin(a) * ry * r });
  }
  return pts;
}

/** Arrow: shaft + two head strokes. */
export function arrow(a: Point, b: Point, rand: () => number): Point[][] {
  const ang = Math.atan2(b.y - a.y, b.x - a.x), hl = 14, spread = 0.5;
  const head = (s: number) => ({ x: b.x - Math.cos(ang + s) * hl, y: b.y - Math.sin(ang + s) * hl });
  return [line(a, b, rand, 2.2), line(head(spread), b, rand, 0.4), line(b, head(-spread), rand, 0.4)];
}
