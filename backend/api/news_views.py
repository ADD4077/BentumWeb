"""Legacy compatibility wrapper for news endpoint."""

from .content.news.views import get_news

__all__ = ["get_news"]
