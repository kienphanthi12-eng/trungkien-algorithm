from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import auth, students, problems, exams, assignments, submissions, chat

import os

app = FastAPI(title="ZENTUS API", version="1.5.0")

# CORS config - Optimized for Production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://trungkien-algorithm.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=[
        "Content-Type",
        "Set-Cookie",
        "Access-Control-Allow-Headers",
        "Access-Control-Allow-Origin",
        "Authorization",
        "X-Requested-With",
        "Accept",
    ],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(students.router, prefix="/students", tags=["Students"])
app.include_router(problems.router, prefix="/problems", tags=["Problems"])
app.include_router(exams.router, prefix="/exams", tags=["Exams"])
app.include_router(assignments.router, prefix="/assignments", tags=["Assignments"])
app.include_router(submissions.router, prefix="/submissions", tags=["Submissions"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])

@app.get("/")
def read_root():
    return {"message": "Welcome to ZENTUS API Phase 6"}
