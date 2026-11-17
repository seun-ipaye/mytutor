/**
 * Speech-to-text. Uses the browser's recognizer (Chrome/Safari): free, streams partial results.
 * Kept behind this small interface so Meta Voice Transcribe (realtime PCM over WebSocket) can replace it later.
 */
type Rec = {
  continuous: boolean; interimResults: boolean; lang: string;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

const Ctor = (window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec })
  .SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => Rec }).webkitSpeechRecognition;

export const canListen = !!Ctor;

export class Listener {
  private rec: Rec | null = null;
  private finalText = "";
  private interim = "";
  private ended: (() => void) | null = null;

  constructor(private onPartial: (text: string) => void, private onError: (msg: string) => void) {}

  get active() {
    return !!this.rec;
  }

  start() {
    if (!Ctor || this.rec) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    this.finalText = this.interim = "";
    rec.onresult = (e) => {
      this.interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) this.finalText += r[0].transcript;
        else this.interim += r[0].transcript;
      }
      this.onPartial(this.text());
    };
    rec.onerror = (e) => {
      if (e.error !== "aborted" && e.error !== "no-speech") this.onError(`Mic: ${e.error}`);
    };
    rec.onend = () => {
      this.rec = null;
      this.ended?.();
      this.ended = null;
    };
    this.rec = rec;
    rec.start();
  }

  /** Stop listening and resolve with everything heard (final + any trailing partial). */
  stop(): Promise<string> {
    const rec = this.rec;
    if (!rec) return Promise.resolve(this.text());
    return new Promise((resolve) => {
      const timeout = setTimeout(() => { this.ended = null; this.rec = null; resolve(this.text()); }, 1200);
      this.ended = () => { clearTimeout(timeout); resolve(this.text()); };
      rec.stop();
    });
  }

  cancel() {
    this.ended = null;
    this.rec?.abort();
    this.rec = null;
  }

  private text() {
    return (this.finalText + " " + this.interim).replace(/\s+/g, " ").trim();
  }
}
