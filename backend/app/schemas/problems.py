from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from datetime import datetime

class TestCase(BaseModel):
    input: str
    output: str

class ProblemBase(BaseModel):
    title: str
    description: str
    difficulty: str  # easy, medium, hard
    category: str
    example_input: str
    example_output: str
    test_cases: List[TestCase]
    time_limit: int = 1000  # milliseconds
    memory_limit: int = 256  # MB

class ProblemCreate(ProblemBase):
    pass

class ProblemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    difficulty: Optional[str] = None
    category: Optional[str] = None
    example_input: Optional[str] = None
    example_output: Optional[str] = None
    test_cases: Optional[List[TestCase]] = None
    time_limit: Optional[int] = None
    memory_limit: Optional[int] = None

class Problem(ProblemBase):
    id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProblemList(BaseModel):
    problems: List[Problem]
    total: int
