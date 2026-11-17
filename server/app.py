"""mytutor backend. Run: uvicorn app:api --reload --port 8000"""
import asyncio
import json

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

import budget  # noqa: E402
from llm import LLMError  # noqa: E402
from tts import TTSError, synthesize  # noqa: E402
from tutor import lesson  # noqa: E402

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
    """One tutoring session. Client: {"type":"ask","question":...} -> server streams {"type":"beat"} ... {"type":"done"}."""
    await ws.accept()
    await ws.send_json({"type": "hello"})
    task: asyncio.Task | None = None

    async def run_lesson(question: str):
        if not budget.take():
            await ws.send_json({"type": "error", "message": "Daily Meta API cap reached (MAX_SPEND_CALLS_PER_DAY)"})
            return
        n = 0
        try:
            async for beat in lesson(question):
                n += 1
                await ws.send_json({"type": "beat", "beat": beat})
        except LLMError as e:
            print(f"[tutor] {e}", flush=True)
            await ws.send_json({"type": "error", "message": str(e)})
        finally:
            print(f"[tutor] streamed {n} beats for: {question!r}", flush=True)
            await ws.send_json({"type": "done", "beats": n})

    try:
        while True:
            msg = json.loads(await ws.receive_text())
            if msg.get("type") == "ask" and msg.get("question", "").strip():
                if task and not task.done():
                    task.cancel()
                task = asyncio.create_task(run_lesson(msg["question"].strip()))
            elif msg.get("type") == "cancel" and task:
                task.cancel()
    except WebSocketDisconnect:
        if task:
            task.cancel()
