"""ElevenLabs TTS with per-character timestamps, cached on disk so replays cost nothing."""
import hashlib
import json
import os
from pathlib import Path

import httpx

CACHE = Path(__file__).parent / ".cache" / "tts"
API = "https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps"


class TTSError(Exception):
    pass


async def synthesize(text: str) -> dict:
    """Returns {"audio_b64": str, "starts_ms": [int per character of text]}."""
    key = os.getenv("ELEVENLABS_API_KEY")
    voice = os.getenv("ELEVENLABS_VOICE_ID")
    model = os.getenv("ELEVENLABS_MODEL", "eleven_multilingual_v2")
    if not key or not voice:
        raise TTSError("ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID not set")

    digest = hashlib.sha256(f"{voice}|{model}|{text}".encode()).hexdigest()[:24]
    path = CACHE / f"{digest}.json"
    if path.exists():
        return json.loads(path.read_text())

    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(
            API.format(voice=voice),
            headers={"xi-api-key": key},
            json={
                "text": text,
                "model_id": model,
                "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.25},
            },
        )
    if r.status_code != 200:
        raise TTSError(f"ElevenLabs {r.status_code}: {r.text[:200]}")

    data = r.json()
    align = data.get("alignment") or {}
    out = {
        "audio_b64": data["audio_base64"],
        "chars": align.get("characters", []),
        "starts_ms": [round(s * 1000) for s in align.get("character_start_times_seconds", [])],
    }
    CACHE.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out))
    return out
