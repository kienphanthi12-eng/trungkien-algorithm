from pydantic import BaseModel, EmailStr
from typing import Dict, Any

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str # 'teacher' or 'student'

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str = ""
    token_type: str = "bearer"
    user: Dict[str, Any]


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
