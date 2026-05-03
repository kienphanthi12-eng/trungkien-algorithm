from pydantic import BaseModel, field_validator
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
import json


class TestCase(BaseModel):
    input: str
    output: str


class ProblemBase(BaseModel):
    title: str
    description: str
    difficulty: str  # easy, medium, hard
    category: str
    # Algorithm fields (optional for math problems)
    example_input: Optional[str] = ""
    example_output: Optional[str] = ""
    test_cases: Optional[List[TestCase]] = []
    time_limit: Optional[int] = 1000
    memory_limit: Optional[int] = 256
    # Math exam fields
    problem_type: Optional[str] = "algorithm"  # algorithm | multiple_choice | true_false | trivia | essay
    choices: Optional[Dict[str, str]] = None   # {"A": "...", "B": "...", "C": "...", "D": "..."}
    correct_answer: Optional[str] = None       # "A"/"B"/"C"/"D" or "true"/"false"
    solution: Optional[str] = None             # Lời giải chi tiết

    @field_validator("test_cases", mode="before")
    @classmethod
    def parse_test_cases(cls, v):
        """Supabase JSONB may return '[]' as a string — parse it."""
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                return parsed if isinstance(parsed, list) else []
            except (json.JSONDecodeError, ValueError):
                return []
        return v if v is not None else []

    @field_validator("choices", mode="before")
    @classmethod
    def parse_choices(cls, v):
        """Supabase JSONB may return choices as a string — parse it."""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, ValueError):
                return None
        return v


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
    problem_type: Optional[str] = None
    choices: Optional[Dict[str, str]] = None
    correct_answer: Optional[str] = None
    solution: Optional[str] = None


class Problem(ProblemBase):
    id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProblemList(BaseModel):
    problems: List[Problem]
    total: int
