import { drawDuration } from "../scene/reducer";
import type { Op } from "../scene/types";
import { prepare, speak, type Speech } from "../voice";
import { compile, type Beat, type CompiledBeat } from "./types";

export type Status = "idle" | "playing" | "paused" | "done";

/** Where we are in the lesson. Commit 8 hands this to the model when you interrupt. */
export interface Playhead {
  status: Status;
  beat: number;
  char: number; // how far into the current beat's text we've spoken
  text: string; // current beat text, for captions
}

/**
 * Plays beats: speaks each one and fires its ops when speech reaches them.
 * Ops are queued so drawings never overlap; the next beat waits for drawing to finish.
 */
export class LessonPlayer {
  private beats: CompiledBeat[];
  private beat = 0;
  private char = 0;
  private fired = new Set<number>(); // cue indexes fired in the current beat
  private status: Status = "idle";
  private speech: Speech | null = null;
  private busyUntil = 0;
  private gen = 0; // bumps on pause/restart so stale speech callbacks die
  private epoch = 0; // bumps only on restart — queued drawings survive a pause

  constructor(
    script: Beat[],
    private onOp: (op: Op) => void,
    private onReset: () => void,
    private onPlayhead: (p: Playhead) => void,
  ) {
    this.beats = script.map(compile);
    this.emit();
  }

  play() {
    if (this.status === "playing") return;
    if (this.status === "done") return this.restart();
    this.status = "playing";
    this.speakFrom(this.beat, this.char);
  }

  pause() {
    if (this.status !== "playing") return;
    this.gen++;
    this.speech?.stop();
    this.status = "paused";
    this.char = wordStart(this.beats[this.beat]?.text ?? "", this.char); // resume from the start of the word
    this.emit();
  }

  restart() {
    this.gen++;
    this.speech?.stop();
    this.epoch++;
    Object.assign(this, { beat: 0, char: 0, busyUntil: 0, status: "idle" as Status });
    this.fired.clear();
    this.onReset();
    this.play();
  }

  stop() {
    this.gen++;
    this.epoch++;
    this.speech?.stop();
  }

  private speakFrom(b: number, c: number) {
    const gen = this.gen;
    const beat = this.beats[b];
    if (!beat) {
      this.status = "done";
      return this.emit();
    }
    if (b !== this.beat) this.fired.clear();
    this.beat = b;
    this.char = c;
    this.fireUpTo(c);
    this.emit();

    // prefetch the next beat's audio while this one plays
    const next = this.beats[b + 1];
    if (next) prepare(next.text).catch(() => {});

    if (!beat.text.slice(c).trim()) return this.afterBeat(gen);
    this.speech = speak(
      beat.text,
      c,
      (i) => {
        if (gen !== this.gen) return;
        this.char = i;
        this.fireUpTo(this.char);
        this.emit();
      },
      () => gen === this.gen && this.afterBeat(gen),
    );
  }

  private afterBeat(gen: number) {
    const beat = this.beats[this.beat];
    this.char = beat.text.length;
    this.fireUpTo(Infinity);
    this.emit();
    // let the drawing catch up, plus a small breath between beats
    const wait = Math.max(0, this.busyUntil - performance.now()) + 250;
    setTimeout(() => gen === this.gen && this.speakFrom(this.beat + 1, 0), wait);
  }

  private fireUpTo(char: number) {
    this.beats[this.beat]?.cues.forEach((cue, i) => {
      if (cue.at > char || this.fired.has(i)) return;
      this.fired.add(i);
      this.schedule(cue.op);
    });
  }

  /** Ops run one after another so strokes never pile on top of each other. */
  private schedule(op: Op) {
    const now = performance.now();
    const at = Math.max(now, this.busyUntil);
    this.busyUntil = at + drawDuration(op);
    const epoch = this.epoch;
    setTimeout(() => epoch === this.epoch && this.onOp(op), at - now);
  }

  private emit() {
    const b = this.beats[this.beat];
    this.onPlayhead({ status: this.status, beat: this.beat, char: this.char, text: b?.text ?? "" });
  }
}

function wordStart(text: string, i: number) {
  while (i > 0 && text[i - 1] !== " ") i--;
  return i;
}
