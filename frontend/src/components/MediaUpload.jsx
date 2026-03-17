import React, { useState, useRef } from 'react';
import { API_ENDPOINTS } from '../config/api.js';
import { X, Upload, Image as ImageIcon, CheckCircle, AlertCircle } from 'lucide-react';
import { showWarning, showError, showSuccess } from '../utils/notifications.js';
import { refreshMediaList } from '../utils/navigation.js';

const MediaUpload = ({ 
  mediaType = 'avatar', 
  onUploadSuccess, 
  onSetActive,
  currentMedia = [],
  maxFiles = 10 
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (!file) return;

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      showWarning('Пожалуйста, выберите изображение');
      return;
    }

    // Проверяем размер (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showWarning('Файл слишком большой. Максимальный размер: 10MB');
      return;
    }

    // Создаем превью
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Загружаем файл
    uploadFile(file);
  };

  const uploadFile = async (file) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('media_type', mediaType);

      // Имитация прогресса загрузки
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const response = await fetch(API_ENDPOINTS.MEDIA_UPLOAD, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = await response.json();

      if (result.success) {
        onUploadSuccess?.(result.media);
        setPreview(null);
        setUploadProgress(0);
        showSuccess('Медиа успешно загружено!');
      } else {
        showError(`Ошибка загрузки: ${result.detail}`);
      }
    } catch (error) {
      showError('Ошибка при загрузке файла');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleSetActive = async (mediaId) => {
    try {
      const response = await fetch(API_ENDPOINTS.MEDIA_SET_ACTIVE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ media_id: mediaId }),
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        onSetActive?.(result.media);
        showSuccess('Медиа установлено как активное!');
      } else {
        showError(`Ошибка: ${result.detail}`);
      }
    } catch (error) {
      showError('Ошибка при установке активного медиа');
    }
  };

  const handleDelete = async (mediaId) => {
    if (!confirm('Вы уверены, что хотите удалить это медиа?')) return;

    try {
      const response = await fetch(`${API_ENDPOINTS.MEDIA_DELETE}/${mediaId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const result = await response.json();
      if (result.success) {
        // Обновляем список медиа
        refreshMediaList(onUploadSuccess);
        showSuccess('Медиа успешно удалено!');
      } else {
        showError(`Ошибка: ${result.detail}`);
      }
    } catch (error) {
      showError('Ошибка при удалении медиа');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Загрузка нового файла */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Загрузить {mediaType === 'avatar' ? 'аватар' : 'баннер'}
        </h3>

        {/* Drag & Drop область */}
        <div
          className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
            dragActive 
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
              : 'border-gray-300 dark:border-slate-600 hover:border-gray-400 dark:hover:border-slate-500'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files[0] && handleFileSelect(e.target.files[0])}
            className="hidden"
          />

          {uploading ? (
            <div className="space-y-4">
              <Loader2 className="w-12 h-12 text-emerald-500 mx-auto animate-spin" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Загрузка... {uploadProgress}%
                </p>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : preview ? (
            <div className="space-y-4">
              <div className="relative mx-auto w-32 h-32 rounded-2xl overflow-hidden">
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                onClick={() => setPreview(null)}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Удалить и выбрать другой
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <ImageIcon className="w-12 h-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Перетащите изображение сюда
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  или
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
                >
                  Выбрать файл
                </button>
              </div>
              <div className="text-xs text-slate-400 dark:text-slate-500">
                <p>Поддерживаемые форматы: JPEG, PNG, WebP, AVIF</p>
                <p>Максимальный размер: 10MB</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Список загруженных медиа */}
      {currentMedia.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Ваши {mediaType === 'avatar' ? 'аватары' : 'баннеры'}
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentMedia.map((media) => (
              <div key={media.id} className="relative group">
                <div className="aspect-square rounded-2xl overflow-hidden bg-gray-100 dark:bg-slate-700">
                  <img
                    src={media.urls.small}
                    alt={media.original_filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Индикатор активности */}
                {media.is_active && (
                  <div className="absolute top-2 right-2 bg-emerald-500 text-white p-1.5 rounded-full">
                    <Check className="w-3 h-3" />
                  </div>
                )}

                {/* Кнопки действий */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center gap-2">
                  {!media.is_active && (
                    <button
                      onClick={() => handleSetActive(media.id)}
                      className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                      title="Сделать активным"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDelete(media.id)}
                    className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Информация о файле */}
                <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  <p className="truncate">{media.original_filename}</p>
                  <p>{formatFileSize(media.file_size)}</p>
                  <p>{media.width} × {media.height}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaUpload;
