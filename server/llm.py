"""Tutor model via Meta Model API, streamed. Reads both OpenAI-style and Meta-native stream formats."""
import json
import os
from pathlib import Path
from typing import AsyncIterator

import httpx

SSE_LOG = Path(__file__).parent / ".cache" / "last_sse.txt"


class LLMError(Exception):
    pass


def text_of(evt) -> str:
    """Pull generated text out of one stream event, whatever shape it is."""
    if not isinstance(evt, dict):
        return ""
    # OpenAI-compatible: choices[0].delta.content (string or list of parts), or full message on non-stream
    for ch in evt.get("choices") or []:
        for key in ("delta", "message"):
            c = (ch.get(key) or {}).get("content")
            if isinstance(c, str):
                return c
            if isinstance(c, list):
                return "".join(p.get("text", "") for p in c if isinstance(p, dict))
        if isinstance(ch.get("text"), str):
            return ch["text"]
    # Meta native: {"event": {"delta": {"type": "text", "text": "..."}}}
    ev = evt.get("event")
    if isinstance(ev, dict):
        d = ev.get("delta") or {}
        if isinstance(d, dict) and isinstance(d.get("text"), str):
            return d["text"]
    # Meta native non-stream: {"completion_message": {"content": {"text": ...}}}
    cm = evt.get("completion_message")
    if isinstance(cm, dict):
        c = cm.get("content")
        if isinstance(c, dict):
            return c.get("text", "")
        if isinstance(c, str):
            return c
    d = evt.get("delta")
    if isinstance(d, dict) and isinstance(d.get("text"), str):
        return d["text"]
    return ""


async def stream_chat(messages: list[dict]) -> AsyncIterator[str]:
    """Yields text deltas as they arrive. Logs the first raw lines to .cache/last_sse.txt for debugging."""
    key = os.getenv("META_API_KEY")
    base = os.getenv("META_API_BASE", "https://api.meta.ai/v1").rstrip("/")
    model = os.getenv("TUTOR_MODEL") or os.getenv("SPARK_MODEL", "muse-ember-1.0")
    if not key:
        raise LLMError("META_API_KEY not set")

    # No max_tokens / max_completion_tokens / temperature: with a token cap Ember returns an empty completion
    # (probed 2026-11-16 — likely the cap counts hidden reasoning). Defaults work.
    body = {"model": model, "messages": messages, "stream": True}
    raw_lines: list[str] = []
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(90, connect=10)) as client:
            async with client.stream("POST", f"{base}/chat/completions", json=body,
                                     headers={"Authorization": f"Bearer {key}"}) as r:
                if r.status_code != 200:
                    raise LLMError(f"Meta API {r.status_code}: {(await r.aread()).decode()[:300]}")
                ctype = r.headers.get("content-type", "")
                if "event-stream" not in ctype:
                    # server ignored stream=true and sent one JSON body
                    raw = (await r.aread()).decode()
                    raw_lines.append(f"[content-type {ctype}]\n{raw[:3000]}")
                    try:
                        text = text_of(json.loads(raw))
                    except json.JSONDecodeError:
                        text = ""
                    if text:
                        yield text
                    return
                async for line in r.aiter_lines():
                    if len(raw_lines) < 12:
                        raw_lines.append(line)
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if data == "[DONE]":
                        return
                    try:
                        evt = json.loads(data)
                    except json.JSONDecodeError:
                        continue
                    if isinstance(evt, dict) and evt.get("error"):
                        raise LLMError(f"Meta API stream error: {str(evt['error'])[:300]}")
                    text = text_of(evt)
                    if text:
                        yield text
    finally:
        SSE_LOG.parent.mkdir(parents=True, exist_ok=True)
        SSE_LOG.write_text("\n".join(raw_lines))
