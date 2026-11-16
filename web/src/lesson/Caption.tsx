import type { Playhead } from "./player";

/** Subtitle with the spoken part inked in — handy for checking sync. */
export function Caption({ p }: { p: Playhead }) {
  if (!p.text) return null;
  return (
    <div className="caption">
      <span className="spoken">{p.text.slice(0, p.char)}</span>
      <span>{p.text.slice(p.char)}</span>
    </div>
  );
}
