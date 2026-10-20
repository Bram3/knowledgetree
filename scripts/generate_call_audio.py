#!/usr/bin/env python3
"""Generate the demo phone call audio with Gemini multi-speaker TTS on Vertex AI.

Reads the dialogue from public/demo/nike-call-transcript.txt (the single source
of truth, also used by the app as the fallback transcript) and writes
public/demo/nike-call.mp3 (plus a .wav if ffmpeg is unavailable).

Auth: an access token from `gcloud auth print-access-token` (never stored).
Config via env: GOOGLE_CLOUD_PROJECT, GOOGLE_CLOUD_LOCATION (default "global"),
GEMINI_TTS_MODEL (default "gemini-2.5-flash-tts").

Usage: python3 scripts/generate_call_audio.py
"""

import base64
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEMO_DIR = ROOT / "public" / "demo"
TRANSCRIPT = DEMO_DIR / "nike-call-transcript.txt"
OUT_WAV = DEMO_DIR / "nike-call.wav"
OUT_MP3 = DEMO_DIR / "nike-call.mp3"

# Speaker label in the transcript -> prebuilt Gemini voice.
VOICES = {
    "Lena": "Aoede",   # Lena Vermeulen, SD Worx payroll consultant
    "Katrin": "Kore",  # Katrin Vogel, Head of Payroll, Nike Germany
}

ATTEMPTS = 6

STYLE = (
    "Read this phone call aloud as a natural, friendly business call in English. "
    "Lena Vermeulen is a warm Belgian payroll consultant at SD Worx. "
    "Katrin Vogel is the Head of Payroll at Nike Germany, brisk and clear, "
    "with a light German accent. Pronounce 'Betriebsrat' the German way."
)


def gcloud(*args: str) -> str:
    return subprocess.check_output(["gcloud", *args], text=True).strip()


# Project, location and model end up in the URL that receives our access token: only plain ids.
SAFE_ID = re.compile(r"^[a-z0-9][a-z0-9._-]{0,99}$")


def endpoint(project: str, location: str, model: str) -> str:
    for name, value in (("GOOGLE_CLOUD_PROJECT", project), ("GOOGLE_CLOUD_LOCATION", location), ("GEMINI_TTS_MODEL", model)):
        if not SAFE_ID.match(value):
            raise ValueError(f"{name} must be a plain id (lowercase letters, digits, '.', '_', '-'), got {value!r}")
    host ="aiplatform.googleapis.com" if location == "global" else f"{location}-aiplatform.googleapis.com"
    return (
        f"https://{host}/v1/projects/{project}/locations/{location}"
        f"/publishers/google/models/{model}:generateContent"
    )


def synthesize(transcript: str) -> tuple[bytes, int]:
    project = os.environ.get("GOOGLE_CLOUD_PROJECT") or gcloud("config", "get-value", "project")
    location = os.environ.get("GOOGLE_CLOUD_LOCATION", "global")
    model = os.environ.get("GEMINI_TTS_MODEL", "gemini-2.5-flash-tts")
    token = gcloud("auth", "print-access-token")

    body = {
        "contents": [{"role": "user", "parts": [{"text": f"{STYLE}\n\n{transcript}"}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "multiSpeakerVoiceConfig": {
                    "speakerVoiceConfigs": [
                        {"speaker": name, "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}
                        for name, voice in VOICES.items()
                    ]
                }
            },
        },
    }
    req = urllib.request.Request(
        endpoint(project, location, model),
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    for attempt in range(ATTEMPTS):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.load(resp)
            break
        except urllib.error.HTTPError as e:
            sys.exit(f"Vertex AI error {e.code}: {e.read().decode()}")
        except (urllib.error.URLError, ConnectionError, TimeoutError) as e:
            if attempt == ATTEMPTS - 1:
                raise
            print(f"request failed ({e}), retrying...", file=sys.stderr)

    part = data["candidates"][0]["content"]["parts"][0]["inlineData"]
    mime = part.get("mimeType", "")
    rate = 24000
    for piece in mime.split(";"):
        if piece.strip().startswith("rate="):
            rate = int(piece.split("=")[1])
    return base64.b64decode(part["data"]), rate


def main() -> None:
    transcript = TRANSCRIPT.read_text(encoding="utf-8").strip()
    pcm, rate = synthesize(transcript)

    with wave.open(str(OUT_WAV), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)  # 16-bit linear PCM
        w.setframerate(rate)
        w.writeframes(pcm)
    print(f"wrote {OUT_WAV.relative_to(ROOT)} ({len(pcm) / (2 * rate):.1f}s)")

    if shutil.which("ffmpeg"):
        subprocess.check_call(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", str(OUT_WAV), "-b:a", "96k", str(OUT_MP3)]
        )
        OUT_WAV.unlink()
        print(f"wrote {OUT_MP3.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
