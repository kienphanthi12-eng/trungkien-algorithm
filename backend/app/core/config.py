from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_KEY: str
    DEEPSEEK_API_KEY: str = ""
    VBEE_APP_ID: str = ""
    VBEE_ACCESS_TOKEN: str = ""
    VBEE_TTS_URL: str = "https://vbee.vn/api/v1/tts"
    VBEE_CALLBACK_URL: str = "https://vbee.vn"
    VBEE_DEFAULT_VOICE: str = "hn_female_thuha_vdts_44k"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
