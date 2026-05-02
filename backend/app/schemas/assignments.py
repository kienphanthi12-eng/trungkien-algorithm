from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class AssignmentCreate(BaseModel):
    student_id: UUID
    problem_id: UUID
    due_date: Optional[datetime] = None


class AssignmentUpdate(BaseModel):
    status: Optional[str] = None
    due_date: Optional[datetime] = None


class Assignment(BaseModel):
    id: UUID
    teacher_id: UUID
    student_id: UUID
    problem_id: UUID
    due_date: Optional[datetime] = None
    status: str
    assigned_at: datetime
    # Enriched fields
    problem_title: Optional[str] = None
    student_name: Optional[str] = None
    student_email: Optional[str] = None

    class Config:
        from_attributes = True


class AssignmentList(BaseModel):
    assignments: List[Assignment]
    total: int
