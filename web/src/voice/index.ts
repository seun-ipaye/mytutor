import { speakBrowser, type Speech } from "./browserTts";
import { playClip, prepare } from "./elevenTts";

export type { Speech };
export { prepare, unlockAudio } from "./elevenTts";
export type Engine = "elevenlabs" | "browser";

let onEngine: (e: Engine) => void = () => {};
export const setEngineListener = (fn: (e: Engine) => void) => (onEngine = fn);

/**
 * Speak full.slice(from). ElevenLabs first (exact per-character timings);
 * if the backend/key isn't available, fall back to the browser voice for that beat.
 */
export function speak(full: string, from: number, onProgress: (c: number) => void, onEnd: () => void): Speech {
  let inner: Speech | null = null, stopped = false;
  prepare(full)
    .then((clip) => {
      if (stopped) return;
      onEngine("elevenlabs");
      inner = playClip(clip, from, onProgress, onEnd);
    })
    .catch((err) => {
      if (stopped) return;
      console.warn("ElevenLabs unavailable, using browser voice:", err);
      onEngine("browser");
      inner = speakBrowser(full, from, onProgress, onEnd);
    });
  return { stop() { stopped = true; inner?.stop(); } };
}
