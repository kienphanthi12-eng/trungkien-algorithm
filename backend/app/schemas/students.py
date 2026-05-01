from pydantic import BaseModel, EmailStr
from typing import List, Optional
from uuid import UUID
from datetime import datetime

class StudentBase(BaseModel):
    email: EmailStr
    name: str

class StudentCreate(BaseModel):
    email: EmailStr

class Student(StudentBase):
    id: UUID
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

class StudentList(BaseModel):
    students: List[Student]
