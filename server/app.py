"""mytutor backend. Run: uvicorn app:api --reload --port 8000"""
import json

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from tts import TTSError, synthesize
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

api = FastAPI(title="mytutor")
api.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@api.get("/health")
def health():
    return {"ok": True}


class TTSRequest(BaseModel):
    text: str


@api.post("/tts")
async def tts(req: TTSRequest):
    """Speech for one beat, with a start time for every character (drives op timing)."""
    try:
        return await synthesize(req.text)
    except TTSError as e:
        print(f"[tts] {e}", flush=True)
        raise HTTPException(503, str(e))


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
