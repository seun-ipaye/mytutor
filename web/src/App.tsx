import { useState } from "react";
import { useSession } from "./useSession";

export default function App() {
  const [log, setLog] = useState<string[]>([]);
  const { status, send } = useSession((msg) => setLog((l) => [...l, JSON.stringify(msg)]));

  return (
    <div className="app">
      <header>
        <span className="logo">mytutor</span>
        <span className={`status ${status}`}>{status}</span>
      </header>
      <main className="board">
        <p className="placeholder">The paper board goes here.</p>
        <button onClick={() => send({ type: "ping", at: Date.now() })} disabled={status !== "open"}>
          Ping server
        </button>
        <pre className="log">{log.join("\n")}</pre>
      </main>
    </div>
  );
}
