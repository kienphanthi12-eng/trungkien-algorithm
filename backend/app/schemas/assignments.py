from pydantic import BaseModel, model_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class AssignmentCreate(BaseModel):
    student_id: UUID
    problem_id: Optional[UUID] = None
    exam_id: Optional[UUID] = None
    due_date: Optional[datetime] = None

    @model_validator(mode="after")
    def check_problem_or_exam(self):
        if self.problem_id is None and self.exam_id is None:
            raise ValueError("Phải cung cấp problem_id hoặc exam_id")
        if self.problem_id is not None and self.exam_id is not None:
            raise ValueError("Chỉ được cung cấp một trong problem_id hoặc exam_id")
        return self


class AssignmentUpdate(BaseModel):
    status: Optional[str] = None
    due_date: Optional[datetime] = None


class Assignment(BaseModel):
    id: UUID
    teacher_id: UUID
    student_id: UUID
    problem_id: Optional[UUID] = None
    exam_id: Optional[UUID] = None
    due_date: Optional[datetime] = None
    status: str
    assigned_at: datetime
    # Enriched fields
    problem_title: Optional[str] = None
    exam_title: Optional[str] = None
    student_name: Optional[str] = None
    student_email: Optional[str] = None

    class Config:
        from_attributes = True


class AssignmentList(BaseModel):
    assignments: List[Assignment]
    total: int
