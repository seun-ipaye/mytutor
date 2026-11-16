import { useEffect, useRef, useState } from "react";

export type Status = "connecting" | "open" | "closed";
const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8000/ws";

/** One WebSocket per tutoring session. Messages are JSON with a `type` field. */
export function useSession(onMessage: (msg: { type: string; [k: string]: unknown }) => void) {
  const [status, setStatus] = useState<Status>("connecting");
  const ws = useRef<WebSocket | null>(null);
  const handler = useRef(onMessage);
  handler.current = onMessage;

  useEffect(() => {
    const sock = new WebSocket(WS_URL);
    ws.current = sock;
    sock.onopen = () => setStatus("open");
    sock.onclose = () => setStatus("closed");
    sock.onmessage = (e) => handler.current(JSON.parse(e.data));
    return () => sock.close();
  }, []);

  const send = (msg: object) => ws.current?.readyState === WebSocket.OPEN && ws.current.send(JSON.stringify(msg));
  return { status, send };
}
