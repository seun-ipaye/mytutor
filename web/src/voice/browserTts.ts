/** Browser speech, used until ElevenLabs lands in commit 5. */
let voice: SpeechSynthesisVoice | null = null;

const PREFERRED = [/premium/i, /enhanced/i, /natural/i, /samantha/i, /google us english/i, /ava/i, /daniel/i];

function pick(): SpeechSynthesisVoice | null {
  const all = speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
  for (const re of PREFERRED) {
    const v = all.find((v) => re.test(v.name));
    if (v) return v;
  }
  return all[0] ?? null;
}

export function getVoice() {
  return (voice ??= pick());
}
speechSynthesis.onvoiceschanged = () => (voice = pick());

export interface Speech {
  stop(): void;
}

/** Speak full.slice(from); reports absolute char offsets (word boundaries), timer fallback if the voice gives none. */
export function speakBrowser(full: string, from: number, onProgress: (char: number) => void, onEnd: () => void): Speech {
  const text = full.slice(from);
  const u = new SpeechSynthesisUtterance(text);
  u.voice = getVoice();
  u.rate = 1.02;
  let stopped = false, gotBoundary = false;
  const started = performance.now();
  const MS_PER_CHAR = 62;

  // fallback estimator for voices without boundary events
  const timer = setInterval(() => {
    if (gotBoundary || stopped) return;
    const elapsed = performance.now() - started;
    if (elapsed > 600) onProgress(from + Math.min(text.length, Math.floor(elapsed / MS_PER_CHAR)));
  }, 80);

  u.onboundary = (e) => {
    if (stopped) return;
    gotBoundary = true;
    onProgress(from + e.charIndex);
  };
  u.onend = u.onerror = () => {
    clearInterval(timer);
    if (!stopped) onEnd();
  };
  (window as unknown as { __utt: unknown }).__utt = u; // Chrome GC bug: keep a reference
  speechSynthesis.speak(u);

  return {
    stop() {
      stopped = true;
      clearInterval(timer);
      speechSynthesis.cancel();
    },
  };
}
