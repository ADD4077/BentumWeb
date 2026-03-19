import React, { useState, useEffect } from 'react';

import { API_ENDPOINTS } from '../config/api.js';

import { X, Save, Upload, Camera, User, AlertTriangle } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext.jsx';



const ProfileEditModal = ({ isOpen, onClose, user, onSave, onForceRefresh, darkMode }) => {

  const { isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({});

  const [avatarPreview, setAvatarPreview] = useState(null);

  const [bannerPreview, setBannerPreview] = useState(null);

  const [avatarFile, setAvatarFile] = useState(null);

  const [bannerFile, setBannerFile] = useState(null);



  // Получаем информацию о бане пользователя

  const [banInfo, setBanInfo] = useState(null);

  const [loadingBanInfo, setLoadingBanInfo] = useState(true);



  useEffect(() => {

    const fetchBanInfo = async () => {

      try {

        const response = await fetch(API_ENDPOINTS.BAN_INFO, {

          method: 'GET',

          credentials: 'include',

        });

        

        if (response.ok) {

          const data = await response.json();

          if (data.success) {

            setBanInfo(data.ban_info);

          } else {

            // Пользователь не забанен, сбрасываем состояние

            setBanInfo(null);

          }

        } else if (response.status === 404) {

          // 404 означает, что пользователь не забанен - это нормальная ситуация

          setBanInfo(null);

        } else if (response.status === 401) {

          // Пользователь не авторизован - это может происходить при истечении сессии

          console.log('User not authorized for ban info check');

          setBanInfo(null);

        } else {

          // Другие ошибки - просто сбрасываем состояние

          console.log('Error checking ban info:', response.status);

          setBanInfo(null);

        }

      } catch (err) {

        setBanInfo(null);

      } finally {

        setLoadingBanInfo(false);

      }

    };



    if (isOpen && user && isAuthenticated) {

      fetchBanInfo();

    }

  }, [isOpen, user, isAuthenticated]);



  const handleSubmit = async (e) => {

    e.preventDefault();

    setLoading(true);

    setErrors({});



    try {

      // Проверяем, есть ли файлы для загрузки

      if (!avatarFile && !bannerFile) {

        setErrors({ general: 'Выберите хотя бы один файл для загрузки' });

        setLoading(false);

        return;

      }



      const updatedData = {};

      

      // Загрузка аватара если есть

      if (avatarFile) {

        const avatarResult = await uploadMedia(avatarFile, 'avatar');

        if (avatarResult.success) {

          updatedData.avatar_url = avatarResult.url;

        } else {

          setErrors({ general: 'Ошибка загрузки аватара' });

          setLoading(false);

          return;

        }

      }

      

      // Загрузка баннера если есть

      if (bannerFile) {

        const bannerResult = await uploadMedia(bannerFile, 'banner');

        if (bannerResult.success) {

          updatedData.banner_url = bannerResult.url;

        } else {

          setErrors({ general: 'Ошибка загрузки баннера' });

          setLoading(false);

          return;

        }

      }



      // Сохранение медиа данных

      const response = await fetch(API_ENDPOINTS.PROFILE_UPDATE, {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

        },

        credentials: 'include',

        body: JSON.stringify(updatedData),

      });



      const result = await response.json();



      if (result.success) {

        // После успешного сохранения запрашиваем актуальные данные с сервера

        try {

          const profileResponse = await fetch(API_ENDPOINTS.PROFILE_UPDATE, {

            method: 'GET',

            credentials: 'include',

          });

          

          if (profileResponse.ok) {

            const profileData = await profileResponse.json();

            if (profileData.success && profileData.user) {

              onSave?.(profileData.user);

              // Принудительно обновляем медиа в основном модальном окне только если авторизованы

              if (isAuthenticated) {

                onForceRefresh?.();

              }

              onClose();

            } else {

              // Если не удалось получить обновленные данные, используем старые

              onSave?.(result.user);

              if (isAuthenticated) {

                onForceRefresh?.();

              }

              onClose();

            }

          } else {

            // Если не удалось получить обновленные данные, используем старые

            onSave?.(result.user);

            if (isAuthenticated) {

              onForceRefresh?.();

            }

            onClose();

          }

        } catch (error) {

          // Если не удалось получить обновленные данные, используем старые

          onSave?.(result.user);

          if (isAuthenticated) {

            onForceRefresh?.();

          }

          onClose();

        }

      } else {

        setErrors({ general: result.detail || 'Ошибка сохранения профиля' });

      }

    } catch (error) {

      setErrors({ general: 'Ошибка при сохранении профиля' });

    } finally {

      setLoading(false);

    }

  };



  const uploadMedia = async (file, mediaType) => {

    const formData = new FormData();

    formData.append('file', file);

    formData.append('media_type', mediaType);



    try {

      const response = await fetch(API_ENDPOINTS.MEDIA_UPLOAD, {

        method: 'POST',

        body: formData,

        credentials: 'include',

      });



      const result = await response.json();

      return result;

    } catch (error) {

      return { success: false, detail: 'Ошибка сети при загрузке файла' };

    }

  };



  const handleAvatarChange = (e) => {

    const file = e.target.files[0];

    if (file) {

      setAvatarFile(file);

      const reader = new FileReader();

      reader.onload = (e) => setAvatarPreview(e.target.result);

      reader.readAsDataURL(file);

    }

  };



  const handleBannerChange = (e) => {

    const file = e.target.files[0];

    if (file) {

      setBannerFile(file);

      const reader = new FileReader();

      reader.onload = (e) => setBannerPreview(e.target.result);

      reader.readAsDataURL(file);

    }

  };



  

  if (!isOpen) return null;



  return (

    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[160] flex items-center justify-center p-4">

      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">

        {/* Header */}

        <div className="relative h-48 bg-gradient-to-r from-emerald-500 to-blue-600">

          {/* Banner */}

          <div className="absolute inset-0">

            {bannerPreview ? (

              <img 

                src={bannerPreview} 

                alt="Banner preview" 

                className="w-full h-full object-cover"

              />

            ) : (

              <div className="w-full h-full bg-gradient-to-r from-emerald-500 to-blue-600" />

            )}

          </div>

          

          {/* Avatar */}

          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">

            <div className="relative group">

              <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border-4 border-white dark:border-slate-800">

                {avatarPreview ? (

                  <img 

                    src={avatarPreview} 

                    alt="Avatar preview" 

                    className="w-full h-full object-cover"

                  />

                ) : (

                  <div className="w-full h-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center">

                    <User className="w-12 h-12 text-gray-400 dark:text-slate-500" />

                  </div>

                )}

              </div>

              

              {/* Avatar upload button - только для незабаненных */}

              {!banInfo && (

                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl cursor-pointer">

                  <Camera className="w-8 h-8 text-white" />

                  <input

                    type="file"

                    accept="image/*"

                    onChange={handleAvatarChange}

                    className="hidden"

                  />

                </label>

              )}

            </div>

          </div>



          {/* Banner upload button - только для незабаненных */}

          {!banInfo && (

            <label className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all cursor-pointer">

              <Upload className="w-5 h-5" />

              <input

                type="file"

                accept="image/*"

                onChange={handleBannerChange}

                className="hidden"

              />

            </label>

          )}



          {/* Close button */}

          <button

            onClick={onClose}

            className="absolute top-4 left-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all"

          >

            <X className="w-5 h-5" />

          </button>

        </div>



        {/* Form */}

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar pt-14">

          {banInfo ? (

            <>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">

                Информация о профиле

              </h2>

              

              {/* Информация о бане */}

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">

                <div className="flex items-start gap-3">

                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />

                  <div className="text-left">

                    <h3 className="font-semibold text-red-800 dark:text-red-300 mb-2">

                      Аккаунт заблокирован

                    </h3>

                    <p className="text-red-700 dark:text-red-400 text-sm">

                      {banInfo.reason}

                    </p>

                    <div className="mt-2 text-red-600 dark:text-red-400 text-xs">

                      Срок: {banInfo.duration_text}

                    </div>

                  </div>

                </div>

              </div>

              

              {/* Информация о пользователе */}

              <div className="bg-gray-50 dark:bg-slate-700/20 border border-gray-200 dark:border-slate-700 rounded-xl p-4">

                <h3 className="font-semibold text-gray-800 dark:text-gray-300 mb-4">

                  Данные профиля

                </h3>

                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">

                  <div className="flex justify-between">

                    <span className="font-medium">ФИмя:</span>

                    <span>{user?.fullname || 'Не указано'}</span>

                  </div>

                  <div className="flex justify-between">

                    <span className="font-medium">Код студента:</span>

                    <span>{user?.student_code || 'Не указан'}</span>

                  </div>

                  <div className="flex justify-between">

                    <span className="font-medium">Факультет:</span>

                    <span>{user?.faculty || 'Не указан'}</span>

                  </div>

                  <div className="flex justify-between">

                    <span className="font-medium">Статус:</span>

                    <span className="text-red-600 dark:text-red-400 font-medium">Заблокирован</span>

                  </div>

                </div>

              </div>

            </>

          ) : (

            <>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 text-center">

                Настройка внешнего вида

              </h2>



              {errors.general && (

                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">

                  <p className="text-red-600 dark:text-red-400 text-sm">{errors.general}</p>

                </div>

              )}



              <form onSubmit={handleSubmit} className="space-y-6">

            

            {/* Upload Instructions */}

            {/* <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">

              <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2">

                Инструкция по загрузке

              </h3>

              <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">

                <li>• Нажмите на аватар или баннер для загрузки нового изображения</li>

                <li>• Поддерживаемые форматы: JPEG, PNG, WebP</li>

                <li>• Максимальный размер файла: 10MB</li>

                <li>• Вы можете загрузить только аватар, только баннер или оба вместе</li>

              </ul>

            </div> */}



            {/* Action buttons */}

            <div className="flex gap-3 pt-4">

              <button

                type="button"

                onClick={onClose}

                className="flex-1 px-6 py-3 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-all"

                disabled={loading}

              >

                Отмена

              </button>

              <button

                type="submit"

                className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"

                disabled={loading}

              >

                {loading ? (

                  <>

                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />

                    Загрузка...

                  </>

                ) : (

                  <>

                    <Save className="w-5 h-5" />

                    Загрузить изображения

                  </>

                )}

              </button>

            </div>

          </form>

            </>

          )}

        </div>

      </div>

    </div>

  );

};



export default ProfileEditModal;

