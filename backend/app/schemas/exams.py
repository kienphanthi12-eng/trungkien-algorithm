from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from app.schemas.problems import Problem

class ExamProblemBase(BaseModel):
    problem_id: UUID
    order_index: int = 0
    points: float = 1.0

class ExamProblemCreate(ExamProblemBase):
    pass

class ExamProblem(ExamProblemBase):
    id: UUID
    exam_id: UUID
    problem: Optional[Problem] = None

    class Config:
        from_attributes = True

class ExamBase(BaseModel):
    title: str
    description: Optional[str] = None
    duration: Optional[int] = 60

class ExamCreate(ExamBase):
    problem_ids: List[UUID]

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[int] = None
    problem_ids: Optional[List[UUID]] = None

class Exam(ExamBase):
    id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None
    problems: List[ExamProblem] = []

    class Config:
        from_attributes = True

class ExamList(BaseModel):
    exams: List[Exam]
    total: int
