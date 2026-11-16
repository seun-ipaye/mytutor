"""mytutor backend. Run: uvicorn app:api --reload --port 8000"""
import json

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

api = FastAPI(title="mytutor")
api.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@api.get("/health")
def health():
    return {"ok": True}


@api.websocket("/ws")
async def session(ws: WebSocket):
    """One tutoring session. Later commits: lesson streaming, interrupts, pen input."""
    await ws.accept()
    await ws.send_json({"type": "hello", "message": "connected"})
    try:
        while True:
            msg = json.loads(await ws.receive_text())
            await ws.send_json({"type": "echo", "received": msg})
    except WebSocketDisconnect:
        pass
