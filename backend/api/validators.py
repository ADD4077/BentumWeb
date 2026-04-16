"""
Input validation schemas using Pydantic
"""
from pydantic import BaseModel, Field, EmailStr, validator
from typing import Optional


class LoginRequest(BaseModel):
    """Login request validation"""
    student_code: str = Field(..., min_length=3, max_length=10, description="Student code")
    password: str = Field(..., min_length=1, description="Password")

    @validator('student_code')
    def validate_student_code(cls, v):
        if not v.isdigit():
            raise ValueError('Student code must be numeric')
        return v


class ProfileUpdateRequest(BaseModel):
    """Profile update request validation"""
    fullname: Optional[str] = Field(None, max_length=100)
    faculty: Optional[str] = Field(None, max_length=10)
    email: Optional[EmailStr] = None


class TwoFAVerifyRequest(BaseModel):
    """2FA verification request validation"""
    code: str = Field(..., min_length=6, max_length=6, description="6-digit code")

    @validator('code')
    def validate_code(cls, v):
        if not v.isdigit():
            raise ValueError('Code must be numeric')
        return v


class TwoFASetupRequest(BaseModel):
    """2FA setup request validation"""
    method: str = Field(..., description="2FA method: telegram or email")
    email: Optional[EmailStr] = None

    @validator('method')
    def validate_method(cls, v):
        if v not in ['telegram', 'email']:
            raise ValueError('Method must be telegram or email')
        return v


class PaginationRequest(BaseModel):
    """Pagination request validation"""
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=10, ge=1, le=100, description="Items per page")


class NewsFilterRequest(PaginationRequest):
    """News filter request validation"""
    category: Optional[str] = None
    search: Optional[str] = Field(None, max_length=100)
    sort_by: Optional[str] = Field('date_desc', max_length=20)
