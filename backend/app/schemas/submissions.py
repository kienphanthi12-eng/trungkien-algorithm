from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class SubmissionCreate(BaseModel):
    assignment_id: str
    text_content: Optional[str] = None
    image_urls: Optional[List[str]] = []


class GradeInfo(BaseModel):
    id: str
    score: Optional[float] = None
    feedback_json: Optional[Any] = None
    graded_at: Optional[datetime] = None
    llm_cost: Optional[float] = None


class Submission(BaseModel):
    id: str
    assignment_id: str
    student_id: Optional[str] = None
    text_content: Optional[str] = None
    image_urls: Optional[List[str]] = []
    submitted_at: Optional[datetime] = None
    # Enriched fields
    problem_title: Optional[str] = None
    problem_description: Optional[str] = None
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    grade: Optional[GradeInfo] = None


class SubmissionList(BaseModel):
    submissions: List[Submission]
    total: int
