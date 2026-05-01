from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import auth
from app.core.config import settings

import os
import base64
import json

app = FastAPI(title="TrungKien Algorithm API", version="1.0.0")

# CORS config - Allow all origins for Phase 1 to avoid "Failed to fetch" errors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])

@app.get("/")
def read_root():
    return {"message": "Welcome to TrungKien Algorithm API Phase 1"}

@app.get("/debug/env")
def debug_env():
    """Diagnose Railway environment — shows JWT role without exposing the secret."""
    key = settings.SUPABASE_SERVICE_KEY
    try:
        payload_b64 = key.split(".")[1]
        padded = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded))
        role = payload.get("role", "UNKNOWN")
        ref = payload.get("ref", "UNKNOWN")
        iss = payload.get("iss", "UNKNOWN")
    except Exception as e:
        role = f"DECODE_ERROR: {e}"
        ref = "N/A"
        iss = "N/A"

    return {
        "supabase_url": settings.SUPABASE_URL,
        "key_role": role,                          # must be "service_role", NOT "anon"
        "key_ref": ref,
        "key_iss": iss,
        "key_prefix": key[:20] + "...",            # safe preview only
        "verdict": "OK" if role == "service_role" else f"WRONG KEY — role is '{role}', must be 'service_role'"
    }
