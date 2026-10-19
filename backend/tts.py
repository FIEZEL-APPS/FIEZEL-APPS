import base64
import hashlib
import time
import uuid
import xml.sax.saxutils
from typing import Optional
try:
    import aiohttp
except ImportError:
    aiohttp = None
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/tts", tags=["neural-tts"])

TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4"
WSS_URL = "wss://api.msedgeservices.com/tts/cognitiveservices/websocket/v1"

# Voice Persona Mapping
PERSONA_CONFIGS = {
    "coach_alex": {
        "edgeVoice": "en-US-GuyNeural",
        "lang": "en-US",
        "personaLabel": "Coach Alex · Native American Coach (GuyNeural)",
        "pitch": "+4Hz",
        "rate": "+2%",
    },
    "guy": {
        "edgeVoice": "en-US-GuyNeural",
        "lang": "en-US",
        "personaLabel": "Coach Alex · Native American Coach (GuyNeural)",
        "pitch": "+4Hz",
        "rate": "+2%",
    },
    "alex": {
        "edgeVoice": "en-US-GuyNeural",
        "lang": "en-US",
        "personaLabel": "Coach Alex · Native American Coach (GuyNeural)",
        "pitch": "+4Hz",
        "rate": "+2%",
    },
    "coach_sarah": {
        "edgeVoice": "en-US-AriaNeural",
        "lang": "en-US",
        "personaLabel": "Coach Sarah · Dynamic Female Coach (AriaNeural)",
        "pitch": "+3Hz",
        "rate": "+1%",
    },
    "aria": {
        "edgeVoice": "en-US-AriaNeural",
        "lang": "en-US",
        "personaLabel": "Coach Sarah · Dynamic Female Coach (AriaNeural)",
        "pitch": "+3Hz",
        "rate": "+1%",
    },
    "sarah": {
        "edgeVoice": "en-US-AriaNeural",
        "lang": "en-US",
        "personaLabel": "Coach Sarah · Dynamic Female Coach (AriaNeural)",
        "pitch": "+3Hz",
        "rate": "+1%",
    },
    "sensei": {
        "edgeVoice": "ja-JP-NanamiNeural",
        "lang": "ja-JP",
        "personaLabel": "NanamiSensei · Mitra Kaiwa Jepang (NanamiNeural)",
        "pitch": "+3Hz",
        "rate": "+1%",
    },
    "nanami": {
        "edgeVoice": "ja-JP-NanamiNeural",
        "lang": "ja-JP",
        "personaLabel": "NanamiSensei · Mitra Kaiwa Jepang (NanamiNeural)",
        "pitch": "+3Hz",
        "rate": "+1%",
    },
    "keita": {
        "edgeVoice": "ja-JP-KeitaNeural",
        "lang": "ja-JP",
        "personaLabel": "Keita · Mahasiswa Percakapan Jepang (KeitaNeural)",
        "pitch": "+4Hz",
        "rate": "+3%",
    },
    "instructor": {
        "edgeVoice": "id-ID-ArdiNeural",
        "lang": "id-ID",
        "personaLabel": "Ardi · Instruktur Ujian Indonesia (ArdiNeural)",
        "pitch": "-6Hz",
        "rate": "-4%",
    },
    "ardi": {
        "edgeVoice": "id-ID-ArdiNeural",
        "lang": "id-ID",
        "personaLabel": "Ardi · Instruktur Ujian Indonesia (ArdiNeural)",
        "pitch": "-6Hz",
        "rate": "-4%",
    },
    "vocab": {
        "edgeVoice": "en-US-AvaNeural",
        "lang": "en-US",
        "personaLabel": "Ava · Leksikon Kosakata (AvaNeural)",
        "pitch": "+0Hz",
        "rate": "-2%",
    },
}

AUDIO_CACHE = {}
CACHE_MAX_SIZE = 250


def resolve_persona(speaker: Optional[str], lang: Optional[str], text: str):
    sp = (speaker or "").lower().strip()
    lg = (lang or "").lower().strip()

    if sp in PERSONA_CONFIGS:
        return PERSONA_CONFIGS[sp]

    if "sarah" in sp or "aria" in sp:
        return PERSONA_CONFIGS["coach_sarah"]
    if "alex" in sp or "guy" in sp:
        return PERSONA_CONFIGS["coach_alex"]
    if "nanami" in sp or "sensei" in sp:
        return PERSONA_CONFIGS["nanami"]
    if "keita" in sp:
        return PERSONA_CONFIGS["keita"]
    if "ardi" in sp or "instruktur" in sp:
        return PERSONA_CONFIGS["instructor"]

    if lg.startswith("ja"):
        return PERSONA_CONFIGS["nanami"]
    if lg.startswith("id"):
        return PERSONA_CONFIGS["instructor"]
    if lg.startswith("en"):
        return PERSONA_CONFIGS["coach_alex"]

    if any(ord(c) >= 0x3040 for c in text):
        return PERSONA_CONFIGS["nanami"]

    return PERSONA_CONFIGS["coach_alex"]


def generate_sec_ms_gec():
    ticks = int(time.time()) + 11644473600
    rounded = ticks - (ticks % 300)
    windows_ticks = rounded * 10000000
    to_hash = f"{windows_ticks}{TRUSTED_CLIENT_TOKEN}".encode("ascii")
    return hashlib.sha256(to_hash).hexdigest().upper()


async def synthesize_edge_tts(text: str, voice_name: str, pitch: str = "+0Hz", rate: str = "+0%", lang: str = "en-US") -> bytes:
    if aiohttp is None:
        raise HTTPException(status_code=503, detail="TTS service dependency (aiohttp) not installed.")
    sec_ms_gec = generate_sec_ms_gec()
    req_id = uuid.uuid4().hex
    url = (
        f"{WSS_URL}?Ocp-Apim-Subscription-Key={TRUSTED_CLIENT_TOKEN}"
        f"&Sec-MS-GEC={sec_ms_gec}&Sec-MS-GEC-Version=1-143.0.3650.96&ConnectionId={req_id}"
    )
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36 Edg/143.0.0.0",
        "Origin": "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
    }
    timeout = aiohttp.ClientTimeout(total=15)
    audio_data = bytearray()
    escaped_text = xml.sax.saxutils.escape(text.strip())

    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.ws_connect(url, headers=headers) as ws:
            cfg = (
                f"Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n"
                f'{{"context":{{"synthesis":{{"audio":{{"metadataoptions":{{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"}},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}}}}}'
            )
            await ws.send_str(cfg)

            ssml = (
                f"X-RequestId:{req_id}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n"
                f"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='{lang}'>"
                f"<voice name='{voice_name}'>"
                f"<prosody pitch='{pitch}' rate='{rate}'>{escaped_text}</prosody>"
                f"</voice></speak>"
            )
            await ws.send_str(ssml)

            async for msg in ws:
                if msg.type == aiohttp.WSMsgType.BINARY:
                    data = msg.data
                    delim = b"Path:audio\r\n"
                    idx = data.find(delim)
                    if idx != -1:
                        audio_data.extend(data[idx + len(delim):])
                elif msg.type == aiohttp.WSMsgType.TEXT:
                    if "Path:turn.end" in msg.data:
                        break
                elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                    break

    return bytes(audio_data)


class TtsLineRequest(BaseModel):
    text: str
    speaker: Optional[str] = None
    lang: Optional[str] = None
    course: Optional[str] = None


@router.get("/personas")
async def get_personas():
    return {
        "ok": True,
        "personas": [
            {
                "id": k,
                "label": v["personaLabel"],
                "voice": v["edgeVoice"],
                "lang": v["lang"],
            }
            for k, v in PERSONA_CONFIGS.items()
            if k in ["coach_alex", "coach_sarah", "nanami", "keita", "instructor", "vocab"]
        ],
    }


@router.post("/line")
async def synthesize_line(req: TtsLineRequest):
    raw_text = (req.text or "").strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    if len(raw_text) > 1000:
        raise HTTPException(status_code=400, detail="Text exceeds 1000 characters limit")

    persona = resolve_persona(req.speaker, req.lang or req.course, raw_text)
    cache_key = f"{persona['edgeVoice']}::{raw_text}"

    if cache_key in AUDIO_CACHE:
        return {
            "ok": True,
            "cached": True,
            **AUDIO_CACHE[cache_key],
        }

    try:
        audio_bytes = await synthesize_edge_tts(
            raw_text,
            voice_name=persona["edgeVoice"],
            pitch=persona.get("pitch", "+0Hz"),
            rate=persona.get("rate", "+0%"),
            lang=persona.get("lang", "en-US"),
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"TTS synthesis failed: {str(exc)}")

    if not audio_bytes:
        raise HTTPException(status_code=502, detail="No audio bytes returned from synthesizer")

    b64 = base64.b64encode(audio_bytes).decode("ascii")
    result = {
        "audioBase64": b64,
        "mimeType": "audio/mpeg",
        "voiceName": persona["edgeVoice"].replace("Neural", ""),
        "personaLabel": persona["personaLabel"],
        "speaker": req.speaker or persona["edgeVoice"],
    }

    if len(AUDIO_CACHE) >= CACHE_MAX_SIZE:
        AUDIO_CACHE.pop(next(iter(AUDIO_CACHE)))
    AUDIO_CACHE[cache_key] = result

    return {
        "ok": True,
        "cached": False,
        **result,
    }
