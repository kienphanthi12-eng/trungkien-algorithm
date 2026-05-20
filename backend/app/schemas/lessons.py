from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class LessonBase(BaseModel):
    title: str
    topic_id: str
    theory_prompt: Optional[str] = None
    objectives: List[str] = []
    order_index: int = 0

class LessonResponse(LessonBase):
    id: str
    topic_title: Optional[str] = None
    subject_name: Optional[str] = None
    grade: Optional[int] = None

    class Config:
        from_attributes = True

class ProgressBase(BaseModel):
    user_id: str
    lesson_id: str
    status: str = Field(default="not_started", description="not_started, in_progress, completed")
    score: int = 0
    time_spent: int = 0  # accumulated seconds

class ProgressUpsertRequest(ProgressBase):
    pass

class ProgressResponse(ProgressBase):
    id: str
    last_accessed_at: datetime

    class Config:
        from_attributes = True
