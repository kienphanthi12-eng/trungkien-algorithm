from fastapi import APIRouter, HTTPException
from app.schemas.tts import TtsRequest
from app.services.tts_service import synthesize_vbee

router = APIRouter()

@router.post("/synthesize")
async def synthesize(req: TtsRequest):
    """
    Synthesize text into speech using Vbee TTS.
    If Vbee key is missing or calls fail, returned audio_url will be empty,
    signaling the frontend to fallback to Web Speech API.
    """
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="text is required")
        
    try:
        url = await synthesize_vbee(req.text, req.voice, req.speed)
        return {"audio_url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS Synthesis error: {str(e)}")
