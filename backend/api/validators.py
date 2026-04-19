"""
Схемы валидации ввода с использованием Pydantic.
"""

from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class LoginRequest(BaseModel):
    """Валидация запроса входа."""

    student_code: str = Field(..., min_length=3, max_length=10, description="Код студента")
    password: str = Field(..., min_length=1, description="Пароль")

    @field_validator("student_code")
    @classmethod
    def validate_student_code(cls, value: str) -> str:
        if not value.isdigit():
            raise ValueError("Код студента должен быть числовым")
        return value


class ProfileUpdateRequest(BaseModel):
    """Валидация запроса обновления профиля."""

    fullname: Optional[str] = Field(None, max_length=100)
    faculty: Optional[str] = Field(None, max_length=10)
    email: Optional[EmailStr] = None


class TwoFAVerifyRequest(BaseModel):
    """Валидация запроса проверки 2FA."""

    code: str = Field(..., min_length=6, max_length=6, description="Шестизначный код")

    @field_validator("code")
    @classmethod
    def validate_code(cls, value: str) -> str:
        if not value.isdigit():
            raise ValueError("Код должен быть числовым")
        return value


class TwoFASetupRequest(BaseModel):
    """Валидация запроса настройки 2FA."""

    method: str = Field(..., description="Метод 2FA: telegram или email")
    email: Optional[EmailStr] = None

    @field_validator("method")
    @classmethod
    def validate_method(cls, value: str) -> str:
        if value not in ["telegram", "email"]:
            raise ValueError("Метод должен быть telegram или email")
        return value


class PaginationRequest(BaseModel):
    """Валидация запроса пагинации."""

    page: int = Field(default=1, ge=1, description="Номер страницы")
    page_size: int = Field(default=10, ge=1, le=100, description="Количество элементов на странице")


class NewsFilterRequest(PaginationRequest):
    """Валидация запроса фильтрации новостей."""

    category: Optional[str] = None
    search: Optional[str] = Field(None, max_length=100)
    sort_by: Optional[str] = Field("date_desc", max_length=20)
