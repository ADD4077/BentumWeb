"""Legacy compatibility wrappers for schedule endpoints."""

from .content.schedule.views import get_next_schedule_lesson, get_schedule

__all__ = ["get_schedule", "get_next_schedule_lesson"]
