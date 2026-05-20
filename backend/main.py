from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from app.api.endpoints import auth, students, problems, exams, assignments, submissions, chat, classrooms, pdf_convert, tts, lessons

import os

app = FastAPI(title="ZENTUS API", version="1.5.0")

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    max_age=3600,
)

# Catchall OPTIONS handler — fixes preflight 405 when CORS middleware doesn't intercept
@app.options("/{rest_of_path:path}")
async def options_handler(rest_of_path: str, request: Request):
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Origin, X-Requested-With",
            "Access-Control-Max-Age": "3600",
        },
    )

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(students.router, prefix="/students", tags=["Students"])
app.include_router(problems.router, prefix="/problems", tags=["Problems"])
app.include_router(exams.router, prefix="/exams", tags=["Exams"])
app.include_router(assignments.router, prefix="/assignments", tags=["Assignments"])
app.include_router(submissions.router, prefix="/submissions", tags=["Submissions"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(classrooms.router, prefix="/classrooms", tags=["Classrooms"])
app.include_router(pdf_convert.router, prefix="/pdf", tags=["PDF Convert"])
app.include_router(tts.router, prefix="/tts", tags=["TTS"])
app.include_router(lessons.router, prefix="/lessons", tags=["Lessons"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Mathora API"}
