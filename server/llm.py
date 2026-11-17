"""Muse Spark via Meta Model API (OpenAI-compatible chat completions), streamed."""
import json
import os
from typing import AsyncIterator

import httpx


class LLMError(Exception):
    pass


async def stream_chat(messages: list[dict], max_tokens: int = 3000, temperature: float = 0.7) -> AsyncIterator[str]:
    """Yields text deltas as they arrive."""
    key = os.getenv("META_API_KEY")
    base = os.getenv("META_API_BASE", "https://api.meta.ai/v1").rstrip("/")
    model = os.getenv("SPARK_MODEL", "muse-spark-1.1")
    if not key:
        raise LLMError("META_API_KEY not set")

    body = {"model": model, "messages": messages, "stream": True, "max_tokens": max_tokens, "temperature": temperature}
    async with httpx.AsyncClient(timeout=httpx.Timeout(60, connect=10)) as client:
        async with client.stream("POST", f"{base}/chat/completions", json=body,
                                 headers={"Authorization": f"Bearer {key}"}) as r:
            if r.status_code != 200:
                raise LLMError(f"Meta API {r.status_code}: {(await r.aread()).decode()[:300]}")
            async for line in r.aiter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    return
                try:
                    delta = json.loads(data)["choices"][0].get("delta", {}).get("content")
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue
                if delta:
                    yield delta
