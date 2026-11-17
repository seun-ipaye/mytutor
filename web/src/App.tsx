import { useEffect, useRef, useState } from "react";
import { Board } from "./render/Board";
import { apply, emptyScene } from "./scene/reducer";
import type { Scene } from "./scene/types";
import { LessonPlayer, type Playhead } from "./lesson/player";
import type { Beat } from "./lesson/types";
import { linkedListLesson } from "./lesson/linkedLists";
import { kitsDemo } from "./lesson/kitsDemo";
import { Caption } from "./lesson/Caption";
import { useSession } from "./useSession";
import { setEngineListener, unlockAudio, type Engine } from "./voice";
import { canListen, Listener } from "./voice/listen";

export default function App() {
  const [scene, setScene] = useState<Scene>(emptyScene);
  const [head, setHead] = useState<Playhead>({ status: "idle", beat: 0, total: 0, char: 0, text: "" });
  const [question, setQuestion] = useState("How do linked lists work?");
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const player = useRef<LessonPlayer | null>(null);
  const [heard, setHeard] = useState<string | null>(null); // live transcript while talking
  const listener = useRef<Listener | null>(null);
  listener.current ??= new Listener(setHeard, setError);

  const { status, send } = useSession((msg) => {
    const p = player.current;
    if (msg.type === "beat") p?.push(msg.beat as Beat);
    else if (msg.type === "done") p?.finish();
    else if (msg.type === "error") setError(String(msg.message));
  });

  useEffect(() => {
    const p = new LessonPlayer((op) => setScene((s) => apply(s, op)), () => setScene(emptyScene), setHead);
    player.current = p;
    setEngineListener(setEngine);
    return () => p.stop();
  }, []);

  const p = player.current;

  function ask(q = question) {
    if (!q.trim() || status !== "open") return;
    unlockAudio();
    setError(null);
    p?.load([], true);
    p?.play(); // sits in "waiting" until the first beat arrives
    send({ type: "ask", question: q });
  }

  // Talk: hold (Space or the button) to speak, or quick-click the button to toggle listening on/off.
  // Talking pauses the tutor; commit 8 turns this into a real interruption with context.
  const talk = useRef({ pausedByMic: false, pressedAt: 0, latched: false });

  function startTalking() {
    if (!canListen || listener.current?.active) return;
    unlockAudio();
    const playing = p?.state === "playing";
    talk.current.pausedByMic = playing;
    if (playing) p?.pause();
    setHeard("");
    listener.current?.start();
  }

  async function stopTalking() {
    if (!listener.current?.active) return;
    const text = await listener.current.stop();
    setHeard(null);
    talk.current.latched = false;
    if (text) {
      setQuestion(text);
      ask(text);
    } else if (talk.current.pausedByMic) p?.play(); // said nothing: carry on, but only if *we* paused it
    talk.current.pausedByMic = false;
  }

  // button: press starts listening; release stops it, unless it was a quick click (then it latches until the next click)
  function micDown() {
    if (talk.current.latched) return void stopTalking();
    talk.current.pressedAt = performance.now();
    startTalking();
  }
  function micUp() {
    if (!listener.current?.active || talk.current.latched) return;
    if (performance.now() - talk.current.pressedAt < 350) talk.current.latched = true;
    else stopTalking();
  }

  function scripted(lesson = linkedListLesson) {
    unlockAudio();
    setError(null);
    send({ type: "cancel" });
    p?.load(lesson);
    p?.play();
  }

  const toggle = () => {
    unlockAudio();
    head.status === "playing" ? p?.pause() : p?.play();
  };
  const label = { idle: "Play", waiting: "Thinking…", playing: "Pause", paused: "Resume", done: "Replay" }[head.status];

  // Hold Space to talk, P to pause/resume. Ignored while typing in the input.
  useEffect(() => {
    const typing = (e: KeyboardEvent) => (e.target as HTMLElement).tagName === "INPUT";
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      if (e.code === "Space") { e.preventDefault(); if (!e.repeat) startTalking(); }
      else if (e.code === "KeyP") toggle();
    };
    const up = (e: KeyboardEvent) => {
      if (!typing(e) && e.code === "Space") { e.preventDefault(); stopTalking(); }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  });

  return (
    <div className="app">
      <header>
        <span className="logo">mytutor</span>
        <form className="ask" onSubmit={(e) => (e.preventDefault(), ask())}>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask anything about linked lists…" />
          <button type="submit" disabled={status !== "open" || head.status === "waiting"}>Ask</button>
          <button type="button" className={`mic ${heard !== null ? "on" : ""}`} disabled={!canListen}
            title={canListen ? "Hold to talk (or hold Space)" : "Speech recognition needs Chrome or Safari"}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); micDown(); }} onPointerUp={micUp}>
            {heard !== null ? (talk.current.latched ? "Click to send" : "Listening…") : "Hold to talk"}
          </button>
        </form>
        <div className="controls">
          <button onClick={toggle} disabled={head.total === 0 && head.status !== "waiting"}>{label}</button>
          <button onClick={() => p?.restart()} disabled={!head.total}>Restart</button>
          <button onClick={() => scripted()} title="Hand-written lesson — demo fallback">Scripted</button>
          <button onClick={() => scripted(kitsDemo)} title="Array + pointers + stack, no model calls">Kits demo</button>
          <span className="beat">{head.total ? `beat ${Math.min(head.beat + 1, head.total)}/${head.total}` : ""}</span>
          {engine && <span className={`status ${engine === "elevenlabs" ? "open" : ""}`}>{engine}</span>}
          <span className={`status ${status}`}>{status}</span>
        </div>
      </header>
      {error && <div className="error">{error}</div>}
      <main className="board">
        <Board scene={scene} />
        <Caption p={head} />
        {heard !== null && <div className="heard"><span>you</span>{heard || "…"}</div>}
      </main>
    </div>
  );
}
