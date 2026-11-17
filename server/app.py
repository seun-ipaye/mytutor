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
from tutor import aside, continuation, lesson  # noqa: E402

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
    """
    One tutoring session. Every client request carries a stream id (sid); replies echo it so the client can ignore stale ones.
      {"type":"ask", sid, question}                         -> beat* , done
      {"type":"interrupt", sid, question, topic, said, upcoming, board}
                                                            -> beat* , then{resume|replan, bridge} , [beat* if replan] , done
      {"type":"cancel"}
    """
    await ws.accept()
    await ws.send_json({"type": "hello"})
    task: asyncio.Task | None = None

    async def send(sid, **msg):
        await ws.send_json({"sid": sid, **msg})

    async def guarded(sid, label: str, body):
        n = 0
        try:
            if not budget.take():
                await send(sid, type="error", message="Daily Meta API cap reached (MAX_SPEND_CALLS_PER_DAY)")
                return
            n = await body()
        except LLMError as e:
            print(f"[tutor] {e}", flush=True)
            await send(sid, type="error", message=str(e))
        except asyncio.CancelledError:
            raise
        finally:
            print(f"[tutor] {label}: {n} beats", flush=True)
            if n == 0:
                await send(sid, type="error", message="The model replied but no beats could be read — see server/.cache/")
            await send(sid, type="done", beats=n)

    async def run_lesson(sid, question: str):
        async def body():
            n = 0
            async for beat in lesson(question):
                n += 1
                await send(sid, type="beat", beat=beat)
            return n
        await guarded(sid, f"lesson {question!r}", body)

    async def run_interrupt(sid, m: dict):
        q, topic = m.get("question", ""), m.get("topic", "")
        said, upcoming, board = m.get("said", ""), m.get("upcoming", ""), m.get("board", "")

        async def body():
            n, decision, aside_beats = 0, None, []
            async for kind, val in aside(q, topic, said, upcoming, board):
                if kind == "beat":
                    n += 1
                    aside_beats.append(val)
                    await send(sid, type="beat", beat=val)
                elif decision is None:
                    decision = val
            decision = decision or {"then": "resume", "bridge": ""}
            print(f"[tutor] interrupt {q!r} -> {decision}", flush=True)
            await send(sid, type="then", **decision)
            if decision["then"] == "replan" and budget.take():
                async for beat in continuation(q, topic, said, board, aside_beats):
                    n += 1
                    await send(sid, type="beat", beat=beat)
            return n
        await guarded(sid, f"interrupt {q!r}", body)

    try:
        while True:
            msg = json.loads(await ws.receive_text())
            kind, sid = msg.get("type"), msg.get("sid")
            if kind in ("ask", "interrupt", "cancel") and task and not task.done():
                task.cancel()  # a new request always supersedes the old stream
            if kind == "ask" and msg.get("question", "").strip():
                task = asyncio.create_task(run_lesson(sid, msg["question"].strip()))
            elif kind == "interrupt" and msg.get("question", "").strip():
                task = asyncio.create_task(run_interrupt(sid, msg))
    except WebSocketDisconnect:
        if task:
            task.cancel()
