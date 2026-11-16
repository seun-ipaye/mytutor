import type { Speech } from "./browserTts";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

interface Clip { url: string; starts: number[] } // starts[i] = ms when character i is spoken

const cache = new Map<string, Promise<Clip>>();
// One shared element: Safari only lets an element play without a fresh tap if it was unlocked once.
const audio = new Audio();

/** Call from a click handler so later beats can play without user gestures. */
export function unlockAudio() {
  audio.src = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA";
  audio.play().catch(() => {});
}

/** Fetch (or reuse) the clip for a beat. Safe to call early to prefetch. */
export function prepare(text: string): Promise<Clip> {
  let p = cache.get(text);
  if (!p) {
    p = fetch(`${API}/tts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) })
      .then(async (r) => {
        if (!r.ok) throw new Error(`tts ${r.status}: ${await r.text()}`);
        const d: { audio_b64: string; starts_ms: number[] } = await r.json();
        const blob = await (await fetch(`data:audio/mpeg;base64,${d.audio_b64}`)).blob();
        return { url: URL.createObjectURL(blob), starts: fit(d.starts_ms, text.length) };
      });
    p.catch(() => cache.delete(text)); // allow retry
    cache.set(text, p);
  }
  return p;
}

/** Play a prepared clip starting at character `from`, reporting the character being spoken. */
export function playClip(clip: Clip, from: number, onProgress: (char: number) => void, onEnd: () => void): Speech {
  let stopped = false, raf = 0;
  const tick = () => {
    if (stopped) return;
    const t = audio.currentTime * 1000;
    let i = from;
    while (i + 1 < clip.starts.length && clip.starts[i + 1] <= t) i++;
    onProgress(i);
    raf = requestAnimationFrame(tick);
  };
  const ended = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    onEnd();
  };

  audio.onended = ended;
  audio.src = clip.url;
  const start = () => {
    audio.currentTime = (clip.starts[from] ?? 0) / 1000;
    audio.play().then(() => (raf = requestAnimationFrame(tick))).catch(ended);
  };
  if (audio.readyState >= 1) start();
  else audio.addEventListener("loadedmetadata", start, { once: true });

  return {
    stop() {
      stopped = true;
      cancelAnimationFrame(raf);
      audio.onended = null;
      audio.pause();
    },
  };
}

/** If the alignment doesn't match our text 1:1, spread it proportionally. */
function fit(starts: number[], len: number): number[] {
  if (starts.length === len || !starts.length) return starts.length ? starts : Array.from({ length: len }, (_, i) => i * 60);
  return Array.from({ length: len }, (_, i) => starts[Math.floor((i / len) * starts.length)]);
}
