import hashlib
import io
import logging
from typing import Optional

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image

from ..media_service import MediaOptimizer, MediaValidator

logger = logging.getLogger(__name__)


class EventBannerStorage:
    MAX_SIZE = (1600, 900)
    QUALITY = 84

    @staticmethod
    def save(file_content: bytes, original_filename: str) -> dict:
        errors = MediaValidator.validate_image(file_content, original_filename)
        if errors:
            raise ValueError(errors[0])

        optimized_content = MediaOptimizer.optimize_image(
            file_content,
            output_format="WEBP",
            quality=EventBannerStorage.QUALITY,
            max_size=EventBannerStorage.MAX_SIZE,
        )

        image = Image.open(io.BytesIO(optimized_content))
        width, height = image.size
        file_hash = hashlib.sha256(optimized_content).hexdigest()
        path = f"events/banners/{file_hash}.webp"

        if not default_storage.exists(path):
            default_storage.save(path, ContentFile(optimized_content))

        return {
            "path": path,
            "file_size": len(optimized_content),
            "width": width,
            "height": height,
            "original_filename": original_filename,
        }

    @staticmethod
    def delete(path: Optional[str]) -> None:
        if not path:
            return
        try:
            if default_storage.exists(path):
                default_storage.delete(path)
        except Exception:
            logger.exception("Failed to delete event banner: %s", path)

    @staticmethod
    def get_url(path: Optional[str]) -> Optional[str]:
        if not path:
            return None
        try:
            if default_storage.exists(path):
                return default_storage.url(path)
        except Exception:
            logger.exception("Failed to build event banner url: %s", path)
        return None
