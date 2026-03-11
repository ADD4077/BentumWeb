import io
from PIL import Image, ImageDraw, ImageFont
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
import hashlib

class PlaceholderGenerator:
    """Генератор плейсхолдеров для аватаров и баннеров"""
    
    @staticmethod
    def get_initials(fullname):
        """Получает инициалы из полного имени"""
        if not fullname:
            return "U"
        
        parts = fullname.strip().split()
        if len(parts) >= 2:
            return (parts[0][0] + parts[1][0]).upper()
        elif len(parts) == 1:
            return parts[0][:2].upper() if len(parts[0]) > 1 else parts[0].upper()
        else:
            return "U"
    
    @staticmethod
    def generate_diagonal_gradient(img, width, height, start_color, end_color):
        """Генерирует диагональный градиент"""
        draw = ImageDraw.Draw(img)
        
        for y in range(height):
            for x in range(width):
                # Диагональный градиент от верхнего левого к нижнему правому
                progress = (x + y) / (width + height)
                
                r = int(start_color[0] + (end_color[0] - start_color[0]) * progress)
                g = int(start_color[1] + (end_color[1] - start_color[1]) * progress)
                b = int(start_color[2] + (end_color[2] - start_color[2]) * progress)
                
                draw.point((x, y), fill=(r, g, b))
        
        return img

    @staticmethod
    def generate_avatar(fullname, size=200):
        """Генерирует аватар с инициалами на диагональном градиенте"""
        # Создаем изображение
        img = Image.new('RGB', (size, size))
        
        # Диагональный градиент в цветах сайта (emerald-600 to teal-600)
        start_color = (16, 185, 129)  # emerald-600
        end_color = (20, 184, 166)    # teal-600
        PlaceholderGenerator.generate_diagonal_gradient(img, size, size, start_color, end_color)
        
        # Получаем инициалы
        initials = PlaceholderGenerator.get_initials(fullname)
        
        # Рисуем инициалы
        try:
            # Пытаемся использовать системный шрифт
            font_size = int(size * 0.4)
            font = ImageFont.truetype("arial.ttf", font_size)
        except:
            # Если шрифт не найден, используем базовый
            font = ImageFont.load_default()
        
        # Получаем размеры текста
        draw = ImageDraw.Draw(img)
        bbox = draw.textbbox((0, 0), initials, font=font)
        
        # Центрируем текст по середине bbox
        center_x = size // 2
        center_y = size // 2
        
        # Находим середину текста
        text_center_x = (bbox[0] + bbox[2]) // 2
        text_center_y = (bbox[1] + bbox[3]) // 2
        
        # Смещаем чтобы центр текста совпал с центром изображения
        x = center_x - text_center_x
        y = center_y - text_center_y
        
        # Рисуем белый текст
        draw.text((x, y), initials, fill=(255, 255, 255), font=font)
        
        return img
    
    @staticmethod
    def generate_banner(width=800, height=200):
        """Генерирует баннер с таким же диагональным градиентом как аватар"""
        # Создаем изображение
        img = Image.new('RGB', (width, height))
        
        # Такой же диагональный градиент как у аватара
        start_color = (16, 185, 129)  # emerald-600
        end_color = (20, 184, 166)    # teal-600
        PlaceholderGenerator.generate_diagonal_gradient(img, width, height, start_color, end_color)
        
        return img
    
    @staticmethod
    def save_placeholder(user, media_type, fullname=None):
        """Сохраняет плейсхолдер для пользователя"""
        try:
            if media_type == 'avatar':
                img = PlaceholderGenerator.generate_avatar(fullname or user.fullname, size=400)
                filename = f"placeholder_avatar_{user.student_code}.webp"
                path = f"users/{user.student_code}/avatars/{filename}"
            elif media_type == 'banner':
                img = PlaceholderGenerator.generate_banner(width=1200, height=400)
                filename = f"placeholder_banner_{user.student_code}.webp"
                path = f"users/{user.student_code}/banners/{filename}"
            else:
                return None
            
            # Конвертируем в WebP и сохраняем
            output = io.BytesIO()
            img.save(output, format='WEBP', quality=85, optimize=True)
            content = output.getvalue()
            
            # Сохраняем файл
            default_storage.save(path, ContentFile(content))
            
            return path
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error generating placeholder for {user.student_code}: {e}")
            return None
    
    @staticmethod
    def get_or_create_placeholder(user, media_type):
        """Получает или создает плейсхолдер"""
        from .models import UserProfileMedia
        
        # Проверяем есть ли уже плейсхолдер
        placeholder = UserProfileMedia.objects.filter(
            user=user,
            media_type=media_type,
            file_path__contains="placeholder_"
        ).first()
        
        if placeholder:
            return placeholder
        
        # Создаем новый плейсхолдер
        file_path = PlaceholderGenerator.save_placeholder(user, media_type)
        if not file_path:
            return None
        
        # Создаем запись в БД
        placeholder = UserProfileMedia.objects.create(
            user=user,
            media_type=media_type,
            original_filename=f"placeholder_{media_type}.webp",
            file_path=file_path,
            file_size=0,  # Будет обновлено позже
            mime_type='image/webp',
            width=400 if media_type == 'avatar' else 1200,
            height=400 if media_type == 'avatar' else 400,
            is_active=True
        )
        
        return placeholder
