# 📸 Интеграция системы медиа файлов

## 🎯 **Обзор решения**

Система обеспечивает хранение огромного количества аватарок и баннеров с минимальным использованием места:

### **🔥 Ключевые преимущества:**
- **Дедупликация:** Одинаковые файлы хранятся один раз
- **Оптимизация:** Автоматическое создание WebP версий
- **Масштабирование:** 4 размера (thumbnail, small, medium, large)
- **CDN готовость:** Поддержка S3 и локального хранения
- **Очистка:** Автоматическое удаление старых файлов

---

## 📁 **Структура файлов**

```
backend/
├── api/
│   ├── models_enhanced.py     # Новые модели медиа
│   ├── media_service.py       # Сервис оптимизации
│   └── media_views.py        # API эндпоинты
├── backend/
│   └── storage_settings.py    # Конфигурация хранилища
└── frontend/src/
    └── components/
        └── MediaUpload.jsx   # Компонент загрузки
```

---

## 🛠️ **Шаги интеграции**

### **1. Обновить модели**
```python
# api/models.py - добавить в конец
from .models_enhanced import UserProfileMedia, MediaOptimization, MediaCache
```

### **2. Создать миграции**
```bash
cd backend
python manage.py makemigrations api
python manage.py migrate
```

### **3. Добавить URL роуты**
```python
# api/urls.py - добавить новые паттерны
from django.urls import path
from . import media_views

urlpatterns = [
    # ... существующие роуты
    path('media/upload', media_views.upload_media, name='upload_media'),
    path('media/set-active', media_views.set_active_media, name='set_active_media'),
    path('media/get', media_views.get_user_media, name='get_user_media'),
    path('media/delete/<int:media_id>', media_views.delete_media, name='delete_media'),
]
```

### **4. Установить зависимости**
```bash
# Backend
pip install Pillow boto3 django-storages

# Frontend  
npm install lucide-react
```

### **5. Настроить хранилище**
```python
# backend/settings.py - добавить
INSTALLED_APPS += ['storages']

# Для production
AWS_ACCESS_KEY_ID = 'your-access-key'
AWS_SECRET_ACCESS_KEY = 'your-secret-key'
AWS_STORAGE_BUCKET_NAME = 'your-bucket'
AWS_S3_REGION = 'us-east-1'
AWS_S3_CUSTOM_DOMAIN = 'cdn.yourdomain.com'

# Использовать оптимизированное хранилище
DEFAULT_FILE_STORAGE = 'backend.storage_settings.S3OptimizedStorage'
```

---

## 📊 **Экономия места**

### **🎯 Техники оптимизации:**

**1. Дедупликация по хешу:**
```
Оригинал: 2.5MB × 100 пользователей = 250MB
С дедупликацией: 2.5MB × 10 уникальных = 25MB
Экономия: 90%
```

**2. Конвертация в WebP:**
```
JPEG: 2.5MB
WebP: 800KB
Экономия: 68%
```

**3. Масштабирование:**
```
Оригинал: 1200×800 = 2.5MB
Thumbnail: 150×150 = 15KB
Small: 300×300 = 45KB
Medium: 800×600 = 400KB
Экономия на превью: 98%
```

### **📈 Пример экономии для 1000 пользователей:**
```
Без оптимизации:
- Аватары: 1000 × 2.5MB = 2.5GB
- Баннеры: 1000 × 5MB = 5GB
- Итого: 7.5GB

С оптимизацией:
- Уникальные файлы: ~200 × 7.5MB = 1.5GB
- WebP версии: 1.5GB × 0.3 = 450MB  
- Превью: 450MB × 0.1 = 45MB
- Итого: ~2GB
Экономия: 73%
```

---

## 🎨 **Использование во фронтенде**

### **В модальном окне профиля:**
```jsx
import MediaUpload from './components/MediaUpload.jsx';

const ProfileModal = () => {
  const [activeTab, setActiveTab] = useState('avatar');
  const [userMedia, setUserMedia] = useState({ avatars: [], banners: [] });

  return (
    <div className="profile-modal">
      {/* Табы для аватаров/баннеров */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('avatar')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'avatar' ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}
        >
          Аватары
        </button>
        <button
          onClick={() => setActiveTab('banner')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'banner' ? 'bg-emerald-600 text-white' : 'bg-gray-200'}`}
        >
          Баннеры
        </button>
      </div>

      {/* Компонент загрузки */}
      <MediaUpload
        mediaType={activeTab}
        currentMedia={activeTab === 'avatar' ? userMedia.avatars : userMedia.banners}
        onUploadSuccess={(media) => {
          // Обновляем список медиа
          setUserMedia(prev => ({
            ...prev,
            [activeTab + 's']: [...prev[activeTab + 's'], media]
          }));
        }}
        onSetActive={(media) => {
          // Обновляем активный медиа в профиле
          updateProfileMedia(media);
        }}
      />
    </div>
  );
};
```

---

## 🔧 **Настройки производительности**

### **1. Очистка старых файлов (cron):**
```python
# management/commands/cleanup_media.py
from django.core.management.base import BaseCommand
from api.media_service import MediaStorage

class Command(BaseCommand):
    def handle(self, *args, **options):
        MediaStorage.cleanup_old_media()
        self.stdout.write('Media cleanup completed')
```

```bash
# Добавить в crontab
0 2 * * * /path/to/venv/bin/python /path/to/manage.py cleanup_media
```

### **2. Мониторинг диска:**
```python
# API эндпоинт для мониторинга
@csrf_exempt
def storage_stats(request):
    from backend.storage_settings import OptimizedStorage
    
    stats = OptimizedStorage.get_disk_usage()
    return JsonResponse({
        'success': True,
        'stats': stats
    })
```

---

## 🚀 **Production рекомендации**

### **1. CDN настройка:**
```nginx
# nginx.conf для CDN
location /media/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header X-Content-Type-Options nosniff;
    
    # Сжатие
    gzip_static on;
    gzip_types image/webp;
}
```

### **2. Cloudflare оптимизация:**
- Включить Brotli сжатие
- Настроить кэширование изображений
- Использовать Polish для автоматической оптимизации

### **3. Мониторинг:**
- Отслеживать использование диска
- Логировать медленные загрузки
- Алерты при превышении лимитов

---

## 📋 **Checklist внедрения**

- [ ] Создать модели и миграции
- [ ] Добавить URL роуты  
- [ ] Установить зависимости
- [ ] Настроить хранилище
- [ ] Интегрировать фронтенд компонент
- [ ] Настроить CDN
- [ ] Добавить мониторинг
- [ ] Тестировать загрузку
- [ ] Настроить очистку

**Готово к использованию!** 🎯✨
