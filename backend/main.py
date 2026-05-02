from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import auth, students, problems, assignments

import os

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
app.include_router(students.router, prefix="/students", tags=["Students"])
app.include_router(problems.router, prefix="/problems", tags=["Problems"])
app.include_router(assignments.router, prefix="/assignments", tags=["Assignments"])

@app.get("/")
def read_root():
    return {"message": "Welcome to TrungKien Algorithm API Phase 4"}
