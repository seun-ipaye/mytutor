import { useEffect, useRef, useState } from "react";
import { Board } from "./render/Board";
import { apply, emptyScene } from "./scene/reducer";
import type { Scene } from "./scene/types";
import { LessonPlayer, type Playhead } from "./lesson/player";
import { linkedListLesson } from "./lesson/linkedLists";
import { Caption } from "./lesson/Caption";
import { useSession } from "./useSession";

export default function App() {
  const [scene, setScene] = useState<Scene>(emptyScene);
  const [head, setHead] = useState<Playhead>({ status: "idle", beat: 0, char: 0, text: "" });
  const player = useRef<LessonPlayer | null>(null);
  const { status } = useSession(() => {});

  useEffect(() => {
    const p = new LessonPlayer(
      linkedListLesson,
      (op) => setScene((s) => apply(s, op)),
      () => setScene(emptyScene),
      setHead,
    );
    player.current = p;
    return () => p.stop();
  }, []);

  const p = player.current;
  const toggle = () => (head.status === "playing" ? p?.pause() : p?.play());
  const label = { idle: "Play lesson", playing: "Pause", paused: "Resume", done: "Replay" }[head.status];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.code === "Space" && (e.preventDefault(), toggle());
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="app">
      <header>
        <span className="logo">mytutor</span>
        <div className="controls">
          <button onClick={toggle}>{label}</button>
          <button onClick={() => p?.restart()} disabled={head.status === "idle"}>Restart</button>
          <span className="beat">beat {head.beat + 1}/{linkedListLesson.length}</span>
          <span className={`status ${status}`}>{status}</span>
        </div>
      </header>
      <main className="board">
        <Board scene={scene} />
        <Caption p={head} />
      </main>
    </div>
  );
}
