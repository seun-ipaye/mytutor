import { useRef, useState } from "react";
import { Board } from "./render/Board";
import { apply, drawDuration, emptyScene } from "./scene/reducer";
import type { Op, Scene } from "./scene/types";
import { linkedListDemo } from "./demo/linkedList";
import { useSession } from "./useSession";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function App() {
  const [scene, setScene] = useState<Scene>(emptyScene);
  const [playing, setPlaying] = useState(false);
  const run = useRef(0);
  const { status } = useSession(() => {});

  // Temporary player — commit 4 replaces this with a real playhead synced to speech.
  async function play(ops: Op[]) {
    const id = ++run.current;
    setScene(emptyScene);
    setPlaying(true);
    for (const op of ops) {
      if (run.current !== id) return;
      setScene((s) => apply(s, op));
      await sleep(drawDuration(op));
    }
    setPlaying(false);
  }

  return (
    <div className="app">
      <header>
        <span className="logo">mytutor</span>
        <div className="controls">
          <button onClick={() => play(linkedListDemo)} disabled={playing}>{playing ? "Drawing…" : "Play demo"}</button>
          <button onClick={() => { run.current++; setPlaying(false); setScene(emptyScene); }}>Clear</button>
          <span className={`status ${status}`}>{status}</span>
        </div>
      </header>
      <main className="board">
        <Board scene={scene} />
      </main>
    </div>
  );
}
