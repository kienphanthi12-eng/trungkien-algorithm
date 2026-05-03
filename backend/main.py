from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import auth, students, problems, exams, assignments, submissions, chat

import os

app = FastAPI(title="ZENTUS API", version="1.5.0")

# CORS config - Maximum Compatibility Mode
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
app.include_router(exams.router, prefix="/exams", tags=["Exams"])
app.include_router(assignments.router, prefix="/assignments", tags=["Assignments"])
app.include_router(submissions.router, prefix="/submissions", tags=["Submissions"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])

@app.get("/")
def read_root():
    return {"message": "Welcome to ZENTUS API Phase 6"}
