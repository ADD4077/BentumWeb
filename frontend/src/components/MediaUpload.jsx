import React, { useRef, useState } from 'react';
import {
  Image as ImageIcon,
  Loader2,
  Check,
  Trash2,
} from 'lucide-react';

import { API_ENDPOINTS } from '../config/api.js';
import { buildCsrfHeaders, ensureCsrfToken } from '../utils/http.js';
import { showWarning, showError, showSuccess } from '../utils/notifications.js';
import { refreshMediaList } from '../utils/navigation.js';

const MediaUpload = ({
  mediaType = 'avatar',
  onUploadSuccess,
  onSetActive,
  currentMedia = [],
  maxFiles = 10,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      showWarning('Пожалуйста, выберите изображение');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showWarning('Файл слишком большой. Максимальный размер: 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPreview(event.target?.result);
    };
    reader.readAsDataURL(file);

    uploadFile(file);
  };

  const uploadFile = async (file) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('media_type', mediaType);

      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const csrfToken = await ensureCsrfToken();
      const response = await fetch(API_ENDPOINTS.MEDIA_UPLOAD, {
        method: 'POST',
        headers: csrfToken ? { 'X-CSRFToken': csrfToken } : undefined,
        body: formData,
        credentials: 'include',
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
    } catch {
      showError('Ошибка при загрузке файла');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleSetActive = async (mediaId) => {
    try {
      const headers = await buildCsrfHeaders({
        'Content-Type': 'application/json',
      });
      const response = await fetch(API_ENDPOINTS.MEDIA_SET_ACTIVE, {
        method: 'POST',
        headers,
        body: JSON.stringify({ media_id: mediaId }),
        credentials: 'include',
      });

      const result = await response.json();
      if (result.success) {
        onSetActive?.(result.media);
        showSuccess('Медиа установлено как активное!');
      } else {
        showError(`Ошибка: ${result.detail}`);
      }
    } catch {
      showError('Ошибка при установке активного медиа');
    }
  };

  const handleDelete = async (mediaId) => {
    if (!window.confirm('Вы уверены, что хотите удалить это медиа?')) {
      return;
    }

    try {
      const headers = await buildCsrfHeaders();
      const response = await fetch(`${API_ENDPOINTS.MEDIA_DELETE}/${mediaId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      const result = await response.json();
      if (result.success) {
        refreshMediaList(onUploadSuccess);
        showSuccess('Медиа успешно удалено!');
      } else {
        showError(`Ошибка: ${result.detail}`);
      }
    } catch {
      showError('Ошибка при удалении медиа');
    }
  };

  const handleDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
    } else if (event.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFileSelect(event.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) {
      return '0 Bytes';
    }

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const index = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / (k ** index)).toFixed(2))} ${sizes[index]}`;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
          Загрузить {mediaType === 'avatar' ? 'аватар' : 'баннер'}
        </h3>

        <div
          className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
            dragActive
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
              : 'border-gray-300 hover:border-gray-400 dark:border-slate-600 dark:hover:border-slate-500'
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
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                handleFileSelect(file);
              }
            }}
            className="hidden"
          />

          {uploading ? (
            <div className="space-y-4">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-emerald-500" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Загрузка... {uploadProgress}%
                </p>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-slate-700">
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : preview ? (
            <div className="space-y-4">
              <div className="relative mx-auto h-32 w-32 overflow-hidden rounded-2xl">
                <img
                  src={preview}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="text-sm font-medium text-red-600 hover:text-red-700"
              >
                Удалить и выбрать другой
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
              <div>
                <p className="mb-2 text-lg font-medium text-slate-700 dark:text-slate-300">
                  Перетащите изображение сюда
                </p>
                <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                  или
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl bg-emerald-600 px-6 py-2 font-medium text-white transition-colors hover:bg-emerald-500"
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

      {currentMedia.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
            Ваши {mediaType === 'avatar' ? 'аватары' : 'баннеры'}
          </h3>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {currentMedia.slice(0, maxFiles).map((media) => (
              <div key={media.id} className="group relative">
                <div className="aspect-square overflow-hidden rounded-2xl bg-gray-100 dark:bg-slate-700">
                  <img
                    src={media.urls.small}
                    alt={media.original_filename}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                {media.is_active && (
                  <div className="absolute right-2 top-2 rounded-full bg-emerald-500 p-1.5 text-white">
                    <Check className="h-3 w-3" />
                  </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-2xl bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  {!media.is_active && (
                    <button
                      type="button"
                      onClick={() => handleSetActive(media.id)}
                      className="rounded-lg bg-emerald-600 p-2 text-white transition-colors hover:bg-emerald-500"
                      title="Сделать активным"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(media.id)}
                    className="rounded-lg bg-red-600 p-2 text-white transition-colors hover:bg-red-500"
                    title="Удалить"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  <p className="truncate">{media.original_filename}</p>
                  <p>{formatFileSize(media.file_size)}</p>
                  <p>{media.width} x {media.height}</p>
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
