import httpx
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

_cache: dict = {}


async def synthesize_vbee(text: str, voice: str = None, speed: float = 1.0) -> str:
    """
    Gọi Vbee TTS API để tổng hợp giọng đọc từ văn bản.
    Payload theo chuẩn Vbee v1: app_id, access_token, input_text, voice_code, callback_url.
    Trả về audio_url hoặc "" nếu thất bại / chưa cấu hình.
    """
    if not text or not text.strip():
        return ""

    voice = voice or settings.VBEE_DEFAULT_VOICE

    cache_key = f"{text[:150]}_{voice}_{speed}"
    if cache_key in _cache:
        return _cache[cache_key]

    if not settings.VBEE_APP_ID or not settings.VBEE_ACCESS_TOKEN:
        logger.warning("VBEE_APP_ID hoặc VBEE_ACCESS_TOKEN chưa được cấu hình.")
        return ""

    payload = {
        "app_id": settings.VBEE_APP_ID,
        "access_token": settings.VBEE_ACCESS_TOKEN,
        "input_text": text.strip(),
        "voice_code": voice,
        "callback_url": settings.VBEE_CALLBACK_URL,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                settings.VBEE_TTS_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code == 200:
                data = resp.json()
                audio_url = data.get("audio_url", "")
                if audio_url:
                    _cache[cache_key] = audio_url
                    return audio_url
                logger.error(f"Vbee response thiếu audio_url: {data}")
            else:
                logger.error(f"Vbee API trả lỗi {resp.status_code}: {resp.text}")
    except Exception as e:
        logger.error(f"Lỗi gọi Vbee TTS: {e}")

    return ""
