import hashlib
import io
import logging
import mimetypes
import os
from datetime import datetime

from PIL import Image
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from .models import MediaOptimization, UserProfileMedia

logger = logging.getLogger(__name__)


def get_unix_timestamp():
    return int(datetime.now().timestamp())


class MediaOptimizer:
    """Image optimization helpers."""

    QUALITY_SETTINGS = {
        "thumbnail": {"quality": 70, "max_size": (150, 150)},
        "small": {"quality": 75, "max_size": (300, 300)},
        "medium": {"quality": 80, "max_size": (800, 600)},
        "large": {"quality": 85, "max_size": (1200, 800)},
    }

    SUPPORTED_FORMATS = {
        "image/jpeg": "JPEG",
        "image/png": "PNG",
        "image/webp": "WEBP",
        "image/avif": "AVIF",
        "image/gif": "GIF",
    }

    @staticmethod
    def get_file_hash(content):
        return hashlib.sha256(content).hexdigest()

    @staticmethod
    def optimize_image(image_content, output_format="WEBP", quality=80, max_size=(1200, 800)):
        try:
            img = Image.open(io.BytesIO(image_content))

            if img.format == "GIF":
                return image_content

            if img.mode in ("RGBA", "LA", "P"):
                img = img.convert("RGB")

            img.thumbnail(max_size, Image.Resampling.LANCZOS)

            output = io.BytesIO()
            img.save(output, format=output_format, quality=quality, optimize=True)
            return output.getvalue()
        except Exception as e:
            logger.error("Error optimizing image: %s", e)
            return image_content

    @staticmethod
    def create_all_sizes(image_content, original_filename):
        sizes = {}
        original_hash = MediaOptimizer.get_file_hash(image_content)

        for size_name, settings in MediaOptimizer.QUALITY_SETTINGS.items():
            try:
                optimized_content = MediaOptimizer.optimize_image(
                    image_content,
                    output_format="WEBP",
                    quality=settings["quality"],
                    max_size=settings["max_size"],
                )

                optimized_filename = f"{original_hash}_{size_name}.webp"
                sizes[size_name] = {
                    "content": optimized_content,
                    "filename": optimized_filename,
                    "size": len(optimized_content),
                    "dimensions": settings["max_size"],
                }
            except Exception as e:
                logger.error("Error creating %s size: %s", size_name, e)

        return sizes


class MediaStorage:
    """Media persistence and deduplication helpers."""

    @staticmethod
    def save_media(user, media_type, file_content, original_filename):
        try:
            mime_type = mimetypes.guess_type(original_filename)[0] or "image/jpeg"
            file_hash = MediaOptimizer.get_file_hash(file_content)

            existing_media = UserProfileMedia.objects.filter(
                user=user,
                file_path__contains=file_hash,
            ).first()

            if existing_media and existing_media.media_type == media_type:
                UserProfileMedia.objects.filter(
                    user=user,
                    media_type=media_type,
                    is_active=True,
                ).update(is_active=False)

                existing_media.is_active = True
                existing_media.save()
                MediaStorage.cleanup_old_media(user, media_type)
                return existing_media

            sizes = MediaOptimizer.create_all_sizes(file_content, original_filename)
            base_path = f"users/{user.student_code}/{media_type}s"

            original_path = f"{base_path}/{file_hash}_original.webp"
            large_content = sizes.get("large", {}).get("content")
            default_storage.save(
                original_path,
                ContentFile(large_content if large_content else file_content),
            )

            for size_name, size_data in sizes.items():
                if size_name == "large" or not size_data:
                    continue
                path = f"{base_path}/{size_data['filename']}"
                default_storage.save(path, ContentFile(size_data["content"]))

            img = Image.open(io.BytesIO(file_content))
            width, height = img.size

            media = UserProfileMedia.objects.create(
                user=user,
                media_type=media_type,
                original_filename=original_filename,
                file_path=original_path,
                file_size=len(file_content),
                mime_type=mime_type,
                width=width,
                height=height,
                is_active=False,
                created_at=get_unix_timestamp(),
            )

            for size_name, size_data in sizes.items():
                if not size_data or not size_data.get("content"):
                    continue
                MediaOptimization.objects.create(
                    original_media=media,
                    size_type=size_name,
                    file_path=f"{base_path}/{size_data['filename']}",
                    file_size=size_data["size"],
                )

            return media
        except Exception as e:
            import traceback

            logger.error("Error in save_media: %s", e)
            logger.error("Traceback: %s", traceback.format_exc())
            logger.error(
                "User: %s, Media type: %s, Filename: %s",
                user.student_code,
                media_type,
                original_filename,
            )
            raise

    @staticmethod
    def get_media_url(media, size="medium"):
        try:
            if not media:
                return None

            optimization = MediaOptimization.objects.filter(
                original_media=media,
                size_type=size,
            ).first()

            if optimization and default_storage.exists(optimization.file_path):
                return default_storage.url(optimization.file_path)

            if default_storage.exists(media.file_path):
                return default_storage.url(media.file_path)

            return None
        except Exception as e:
            logger.error("Error getting media URL: %s", e)
            return None

    @staticmethod
    def get_placeholder_data(user, media_type):
        try:
            from .placeholder_service import PlaceholderGenerator

            if media_type == "avatar":
                return PlaceholderGenerator.get_avatar_placeholder_data(user.fullname)
            if media_type == "banner":
                return PlaceholderGenerator.get_banner_placeholder_data()
            return None
        except Exception as e:
            logger.error("Error getting placeholder data: %s", e)
            return None

    @staticmethod
    def delete_media_files(media):
        try:
            if default_storage.exists(media.file_path):
                default_storage.delete(media.file_path)

            for opt in media.optimized_versions.all():
                if default_storage.exists(opt.file_path):
                    default_storage.delete(opt.file_path)
                opt.delete()

            media.delete()
            logger.info("Deleted media files: %s", media.id)
        except Exception as e:
            logger.error("Error deleting media %s: %s", media.id, e)

    @staticmethod
    def cleanup_old_media(user, media_type):
        try:
            old_media = UserProfileMedia.objects.filter(
                user=user,
                media_type=media_type,
                is_active=False,
            )

            deleted_count = 0
            for media in old_media:
                try:
                    MediaStorage.delete_media_files(media)
                    deleted_count += 1
                except Exception as e:
                    logger.error("Error deleting old media %s: %s", media.id, e)

            logger.info(
                "Cleaned up %s old %ss for user %s",
                deleted_count,
                media_type,
                user.student_code,
            )
        except Exception as e:
            logger.error("Error in cleanup_old_media: %s", e)

    @staticmethod
    def cleanup_all_old_media():
        cutoff_date = get_unix_timestamp() - (30 * 24 * 60 * 60)
        old_media = UserProfileMedia.objects.filter(
            created_at__lt=cutoff_date,
            is_active=False,
        )

        for media in old_media:
            try:
                if default_storage.exists(media.file_path):
                    default_storage.delete(media.file_path)

                for opt in media.optimized_versions.all():
                    if default_storage.exists(opt.file_path):
                        default_storage.delete(opt.file_path)

                media.delete()
                logger.info("Cleaned up old media: %s", media.id)
            except Exception as e:
                logger.error("Error cleaning up media %s: %s", media.id, e)


class MediaValidator:
    """Media file validation."""

    ALLOWED_MIME_TYPES = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/avif",
        "image/gif",
    ]

    FORMAT_TO_MIME = {
        "JPEG": "image/jpeg",
        "PNG": "image/png",
        "WEBP": "image/webp",
        "AVIF": "image/avif",
        "GIF": "image/gif",
    }

    MAX_FILE_SIZE = 10 * 1024 * 1024
    MAX_DIMENSIONS = (4000, 4000)

    @staticmethod
    def validate_image(file_content, filename):
        errors = []

        if len(file_content) > MediaValidator.MAX_FILE_SIZE:
            errors.append(f"Файл слишком большой: {len(file_content) / 1024 / 1024:.1f}MB")

        try:
            img = Image.open(io.BytesIO(file_content))
            img.verify()

            img = Image.open(io.BytesIO(file_content))
            detected_format = (img.format or "").upper()
            detected_mime_type = MediaValidator.FORMAT_TO_MIME.get(detected_format)

            if detected_mime_type not in MediaValidator.ALLOWED_MIME_TYPES:
                errors.append(
                    f"Неподдерживаемый формат изображения: {detected_format or os.path.splitext(filename)[1]}"
                )

            if (
                img.size[0] > MediaValidator.MAX_DIMENSIONS[0]
                or img.size[1] > MediaValidator.MAX_DIMENSIONS[1]
            ):
                errors.append(f"Изображение слишком большое: {img.size}")
        except Exception as e:
            errors.append(f"Невозможно прочитать изображение: {e}")

        return errors
