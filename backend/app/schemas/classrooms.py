from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime

class ClassroomBase(BaseModel):
    name: str
    description: Optional[str] = None

class ClassroomCreate(ClassroomBase):
    pass

class ClassroomUpdate(ClassroomBase):
    name: Optional[str] = None

class StudentInfo(BaseModel):
    id: UUID
    name: str
    email: str
    joined_at: datetime

class Classroom(ClassroomBase):
    id: UUID
    teacher_id: UUID
    created_at: datetime
    student_count: int = 0
    students: Optional[List[StudentInfo]] = None

    class Config:
        from_attributes = True

class ClassroomList(BaseModel):
    classrooms: List[Classroom]
    total: int
