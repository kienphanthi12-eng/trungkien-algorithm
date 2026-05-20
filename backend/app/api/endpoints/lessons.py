from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from app.schemas.lessons import LessonResponse, ProgressUpsertRequest, ProgressResponse
from app.services.lesson_service import LessonService
from app.api.dependencies import get_current_user

router = APIRouter()

@router.get("/subjects")
def get_subjects(grade: Optional[int] = Query(None, description="Grade filter (e.g. 9)")):
    """
    Get list of subjects, optionally filtered by grade.
    """
    try:
        return LessonService.get_subjects(grade)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/subjects/{subject_id}/topics")
def get_topics(subject_id: str):
    """
    Get all topics under a specific subject.
    """
    try:
        return LessonService.get_topics_by_subject(subject_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/topics/{topic_id}/lessons")
def get_lessons(topic_id: str):
    """
    Get all lessons under a specific topic.
    """
    try:
        return LessonService.get_lessons_by_topic(topic_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{lesson_id}", response_model=LessonResponse)
def get_lesson(lesson_id: str):
    """
    Get a single lesson details by ID.
    """
    lesson = LessonService.get_lesson_by_id(lesson_id)
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson

@router.get("/progress/{user_id}")
def get_progress(user_id: str, current_user=Depends(get_current_user)):
    """
    Get all learning progress entries for a given student.
    Users can only query their own progress unless they are teachers.
    """
    is_teacher = current_user.user_metadata.get("role") == "teacher"
    if str(current_user.id) != user_id and not is_teacher:
        raise HTTPException(status_code=403, detail="Not authorized to access this user's progress")
        
    try:
        return LessonService.get_learning_progress(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/progress")
def upsert_progress(req: ProgressUpsertRequest, current_user=Depends(get_current_user)):
    """
    Upsert progress for a lesson.
    Users can only update their own progress.
    """
    if str(current_user.id) != req.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this user's progress")
        
    try:
        progress = LessonService.upsert_learning_progress(
            user_id=req.user_id,
            lesson_id=req.lesson_id,
            status=req.status,
            score=req.score,
            time_spent=req.time_spent
        )
        return progress
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
