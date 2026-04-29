from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import auth

import os

app = FastAPI(title="TrungKien Algorithm API", version="1.0.0")

# CORS config
frontend_url = os.getenv("FRONTEND_URL", "*")
allow_origins = [url.strip() for url in frontend_url.split(",")] if frontend_url != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])

@app.get("/")
def read_root():
    return {"message": "Welcome to TrungKien Algorithm API Phase 1"}
