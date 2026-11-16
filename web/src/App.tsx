import { useRef, useState } from "react";
import { Board } from "./render/Board";
import { apply, drawDuration, emptyScene } from "./scene/reducer";
import type { Op, Scene } from "./scene/types";
import { linkedListDemo } from "./demo/linkedList";
import { useSession } from "./useSession";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let counter = 100;

export default function App() {
  const [scene, setScene] = useState<Scene>(emptyScene);
  const [busy, setBusy] = useState(false);
  const run = useRef(0);
  const { status } = useSession(() => {});
  const list = scene.lists.find((l) => l.id === "L");

  // Temporary player — commit 4 replaces this with a real playhead synced to speech.
  async function play(ops: Op[], reset = false) {
    const id = ++run.current;
    if (reset) setScene(emptyScene);
    setBusy(true);
    for (const op of ops) {
      if (run.current !== id) return;
      setScene((s) => apply(s, op));
      await sleep(drawDuration(op));
    }
    setBusy(false);
  }

  const insertRandom = () => {
    const n = list?.nodes.length ?? 0;
    play([{ op: "insert", list: "L", id: `n${++counter}`, label: String(1 + Math.floor(Math.random() * 99)), index: Math.floor(Math.random() * (n + 1)) }]);
  };
  const deleteRandom = () => {
    if (!list?.nodes.length) return;
    play([{ op: "remove", list: "L", id: list.nodes[Math.floor(Math.random() * list.nodes.length)] }]);
  };

  return (
    <div className="app">
      <header>
        <span className="logo">mytutor</span>
        <div className="controls">
          <button onClick={() => play(linkedListDemo, true)} disabled={busy}>Play demo</button>
          <button onClick={insertRandom} disabled={busy || !list}>Insert</button>
          <button onClick={deleteRandom} disabled={busy || !list?.nodes.length}>Delete</button>
          <button onClick={() => play([{ op: "reverse", list: "L" }])} disabled={busy || (list?.nodes.length ?? 0) < 2}>Reverse</button>
          <button onClick={() => { run.current++; setBusy(false); setScene(emptyScene); }}>Clear</button>
          <span className={`status ${status}`}>{status}</span>
        </div>
      </header>
      <main className="board">
        <Board scene={scene} />
      </main>
    </div>
  );
}
