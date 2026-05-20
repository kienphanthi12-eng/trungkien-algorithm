from pydantic import BaseModel, Field
from typing import Optional

class TtsRequest(BaseModel):
    text: str = Field(..., description="Text to be synthesized into speech")
    voice: Optional[str] = Field(default="hn_female_thuha_vdts_44k", description="Voice code for Vbee TTS")
    speed: float = Field(default=1.0, description="Speech playback speed, range usually 0.8x to 1.5x")
