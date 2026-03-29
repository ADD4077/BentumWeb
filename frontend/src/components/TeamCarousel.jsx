import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import UserProfileModal from './UserProfileModal.jsx';
import { API_ENDPOINTS } from '../config/api.js';

function TeamCarousel({ teamMembers, darkMode }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedStudentCode, setSelectedStudentCode] = useState(null);
  const [memberAvatars, setMemberAvatars] = useState({});
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const carouselRef = useRef(null);

  // Маппинг имен администраторов на их студенческие коды
  const adminMapping = {
    'Свиридович Павел': '1090352523',
    'Смоленский Андрей': '1090372523', 
    'Гончарик Александр': '1090352506',
    'Абраменко Александр': '1090352501',
    'Альшевский Алексей': '1030522501'
  };

  // Загрузка аватарок пользователей
  useEffect(() => {
    const loadMemberAvatars = async () => {
      const avatars = {};
      
      for (const member of teamMembers) {
        const studentCode = adminMapping[member.name];
        if (studentCode) {
          try {
            const response = await fetch(`${API_ENDPOINTS.BASE_URL}/api/user/by-code/${studentCode}`, {
              credentials: 'include',
            });

            if (response.ok) {
              const data = await response.json();
              if (data?.success && data?.user) {
                // Проверяем avatar_url на верхнем уровне ответа
                if (data.user.avatar_url) {
                  avatars[member.name] = data.user.avatar_url;
                }
              }
            } else {
              // Пользователь не найден, оставляем плейсхолдер
            }
          } catch {
            // Игнорируем ошибки, оставляем плейсхолдер
          }
        }
      }
      
      setMemberAvatars(avatars);
    };

    if (teamMembers.length > 0) {
      loadMemberAvatars();
    }
  }, [teamMembers]);

  const handleAvatarClick = async (memberName) => {
    const studentCode = adminMapping[memberName];
    if (!studentCode) return;

    try {
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}/api/user/by-code/${studentCode}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      if (!data?.success || !data?.user) {
        return;
      }

      setSelectedStudentCode(studentCode);
      setIsProfileModalOpen(true);
    } catch {
      return;
    }
  };
  const startAutoPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === teamMembers.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000);
  }, [teamMembers.length]);
  
  const stopAutoPlay = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);
  
  const resumeAutoPlay = useCallback(() => {
    stopAutoPlay();
    timeoutRef.current = setTimeout(() => {
      setIsAutoPlaying(true);
      startAutoPlay();
    }, 8000);
  }, [stopAutoPlay, startAutoPlay]);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => 
      prevIndex === teamMembers.length - 1 ? 0 : prevIndex + 1
    );
    resumeAutoPlay();
  }, [teamMembers.length, resumeAutoPlay]);
  
  const prevSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? teamMembers.length - 1 : prevIndex - 1
    );
    resumeAutoPlay();
  }, [teamMembers.length, resumeAutoPlay]);
  
  const goToSlide = useCallback((index) => {
    setCurrentIndex(index);
    resumeAutoPlay();
  }, [resumeAutoPlay]);

  // Touch handlers for swipe
  const handleTouchStart = useCallback((e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  }, [touchStart, touchEnd, nextSlide, prevSlide]);
  useEffect(() => {
    if (isAutoPlaying && teamMembers.length > 1) {
      startAutoPlay();
    }
    return () => {
      stopAutoPlay();
    };
  }, [isAutoPlaying, teamMembers.length]);
  return (
    <div className="w-full max-w-6xl mx-auto mt-0">
      <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-12">
        Наша команда
      </h2>
      <div className="relative">
        <div 
          ref={carouselRef}
          className="overflow-hidden rounded-2xl max-w-4xl mx-auto" 
          style={{ 
            padding: '20px',
            touchAction: 'pan-y pinch-zoom'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {teamMembers.map((member, index) => (
              <div key={index} className="w-full flex-shrink-0 px-4">
                <div className="max-w-md mx-auto bg-white/40 dark:bg-slate-800/40 border border-white/50 dark:border-slate-700/50 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-md">
                  <div className="flex flex-col items-center text-center">
                    <div 
                      className="w-32 h-32 rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg flex items-center justify-center mb-6 transition-all duration-300 ease-out transform translate-y-0 rotate-0 hover:shadow-2xl hover:shadow-gray-400/50 group cursor-pointer hover:-translate-y-2 hover:rotate-6"
                      onClick={() => handleAvatarClick(member.name)}
                    >
                      {memberAvatars[member.name] ? (
                        <img 
                          src={memberAvatars[member.name].startsWith('/') ? `${API_ENDPOINTS.BASE_URL}${memberAvatars[member.name]}` : memberAvatars[member.name]}
                          alt={member.name}
                          className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-110 group-hover:contrast-105"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      {!memberAvatars[member.name] && (
                        <span className="text-white text-4xl font-bold transition-all duration-300 group-hover:text-white group-hover:scale-110">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                      {member.name}
                    </h3>
                    <p className="text-emerald-600 dark:text-emerald-400 font-semibold mb-4">
                      {member.role}
                    </p>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      {member.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={prevSlide}
          className="w-12 h-12 bg-white/40 dark:bg-slate-800/40 border border-white/50 dark:border-slate-700/50 rounded-full flex items-center justify-center shadow-lg hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all duration-300 backdrop-blur-md"
        >
          <span className="text-slate-900 dark:text-white text-xl">‹</span>
        </button>
        <div className="flex gap-2">
          {teamMembers.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-gray-500/60 w-8' 
                  : 'bg-gray-300/40 dark:bg-gray-600/40 hover:bg-gray-400/60 dark:hover:bg-gray-500/60'
              }`}
            />
          ))}
        </div>
        <button
          onClick={nextSlide}
          className="w-12 h-12 bg-white/40 dark:bg-slate-800/40 border border-white/50 dark:border-slate-700/50 rounded-full flex items-center justify-center shadow-lg hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all duration-300 backdrop-blur-md"
        >
          <span className="text-slate-900 dark:text-white text-xl">›</span>
        </button>
      </div>
      
      {/* Модальное окно профиля пользователя */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedStudentCode(null);
        }}
        studentCode={selectedStudentCode}
        darkMode={darkMode}
      />
    </div>
  );
}
export default TeamCarousel;
