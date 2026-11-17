import { useEffect, useRef, useState } from "react";
import { Board } from "./render/Board";
import { apply, emptyScene } from "./scene/reducer";
import type { Scene } from "./scene/types";
import { LessonPlayer, type Playhead } from "./lesson/player";
import type { Beat } from "./lesson/types";
import { linkedListLesson } from "./lesson/linkedLists";
import { Caption } from "./lesson/Caption";
import { useSession } from "./useSession";
import { setEngineListener, unlockAudio, type Engine } from "./voice";

export default function App() {
  const [scene, setScene] = useState<Scene>(emptyScene);
  const [head, setHead] = useState<Playhead>({ status: "idle", beat: 0, total: 0, char: 0, text: "" });
  const [question, setQuestion] = useState("How do linked lists work?");
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const player = useRef<LessonPlayer | null>(null);

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

  function ask() {
    if (!question.trim() || status !== "open") return;
    unlockAudio();
    setError(null);
    p?.load([], true);
    p?.play(); // sits in "waiting" until the first beat arrives
    send({ type: "ask", question });
  }

  function scripted() {
    unlockAudio();
    setError(null);
    send({ type: "cancel" });
    p?.load(linkedListLesson);
    p?.play();
  }

  const toggle = () => {
    unlockAudio();
    head.status === "playing" ? p?.pause() : p?.play();
  };
  const label = { idle: "Play", waiting: "Thinking…", playing: "Pause", paused: "Resume", done: "Replay" }[head.status];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || (e.target as HTMLElement).tagName === "INPUT") return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="app">
      <header>
        <span className="logo">mytutor</span>
        <form className="ask" onSubmit={(e) => (e.preventDefault(), ask())}>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask anything about linked lists…" />
          <button type="submit" disabled={status !== "open" || head.status === "waiting"}>Ask</button>
        </form>
        <div className="controls">
          <button onClick={toggle} disabled={head.total === 0 && head.status !== "waiting"}>{label}</button>
          <button onClick={() => p?.restart()} disabled={!head.total}>Restart</button>
          <button onClick={scripted} title="Hand-written lesson — demo fallback">Scripted</button>
          <span className="beat">{head.total ? `beat ${Math.min(head.beat + 1, head.total)}/${head.total}` : ""}</span>
          {engine && <span className={`status ${engine === "elevenlabs" ? "open" : ""}`}>{engine}</span>}
          <span className={`status ${status}`}>{status}</span>
        </div>
      </header>
      {error && <div className="error">{error}</div>}
      <main className="board">
        <Board scene={scene} />
        <Caption p={head} />
      </main>
    </div>
  );
}
