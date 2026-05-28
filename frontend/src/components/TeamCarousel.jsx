import React, { useState, useEffect, useRef, useCallback } from 'react';
import UserProfileModal from './UserProfileModal.jsx';
import { fetchUserProfileByCode } from '../services/userProfiles.js';
import { buildMediaUrl } from '../utils/media.js';

function TeamCarousel({ teamMembers, darkMode }) {
  const safeTeamMembers = Array.isArray(teamMembers) ? teamMembers : [];
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

  useEffect(() => {
    if (safeTeamMembers.length === 0) {
      setMemberAvatars({});
      return undefined;
    }

    let cancelled = false;

    const loadMemberAvatars = async () => {
      const avatars = {};
      const membersWithCodes = safeTeamMembers
        .map((member) => ({ member, studentCode: member.studentCode }))
        .filter(({ studentCode }) => Boolean(studentCode));

      const profiles = await Promise.all(
        membersWithCodes.map(({ studentCode }) => fetchUserProfileByCode(studentCode)),
      );

      membersWithCodes.forEach(({ member }, index) => {
        const profile = profiles[index];
        if (profile?.avatar_url) {
          avatars[member.name] = profile.avatar_url;
        }
      });

      if (!cancelled) {
        setMemberAvatars(avatars);
      }
    };

    if (safeTeamMembers.length > 0) {
      loadMemberAvatars();
    }

    return () => {
      cancelled = true;
    };
  }, [safeTeamMembers]);

  const handleAvatarClick = async (member) => {
    const studentCode = member.studentCode;
    if (!studentCode) return;

    try {
      const profile = await fetchUserProfileByCode(studentCode);
      if (!profile) {
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
      setCurrentIndex((prevIndex) => (
        prevIndex === safeTeamMembers.length - 1 ? 0 : prevIndex + 1
      ));
    }, 4000);
  }, [safeTeamMembers.length]);

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
    setCurrentIndex((prevIndex) => (
      prevIndex === safeTeamMembers.length - 1 ? 0 : prevIndex + 1
    ));
    resumeAutoPlay();
  }, [safeTeamMembers.length, resumeAutoPlay]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (
      prevIndex === 0 ? safeTeamMembers.length - 1 : prevIndex - 1
    ));
    resumeAutoPlay();
  }, [safeTeamMembers.length, resumeAutoPlay]);

  const goToSlide = useCallback((index) => {
    setCurrentIndex(index);
    resumeAutoPlay();
  }, [resumeAutoPlay]);

  const handleTouchStart = useCallback((event) => {
    setTouchEnd(null);
    setTouchStart(event.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((event) => {
    setTouchEnd(event.targetTouches[0].clientX);
  }, []);

  const handleTouchSlideEnd = useCallback(() => {
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
    if (isAutoPlaying && safeTeamMembers.length > 1) {
      startAutoPlay();
    }
    return () => {
      stopAutoPlay();
    };
  }, [isAutoPlaying, safeTeamMembers.length, startAutoPlay, stopAutoPlay]);

  useEffect(() => {
    if (currentIndex >= safeTeamMembers.length) {
      setCurrentIndex(0);
    }
  }, [currentIndex, safeTeamMembers.length]);

  if (!safeTeamMembers.length) {
    return null;
  }

  return (
    <div className="mx-auto mt-0 w-full max-w-5xl px-2 sm:px-4">
      <h2 className="mb-6 text-center text-2xl font-bold text-slate-900 dark:text-white sm:mb-8 sm:text-3xl">
        Наша команда
      </h2>
      <div className="relative overflow-visible">
        <div className="mx-auto max-w-3xl overflow-visible px-0 pt-1 sm:px-2 sm:pb-8 sm:pt-3">
          <div
            ref={carouselRef}
            className="overflow-hidden rounded-2xl"
            style={{
              padding: '16px 8px 24px',
              touchAction: 'pan-y pinch-zoom',
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchSlideEnd}
          >
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {safeTeamMembers.map((member, index) => (
                <div key={index} className="w-full flex-shrink-0 px-2 sm:px-3">
                  <div className="glass-card interactive-lift shimmer-surface mx-auto max-w-[18.5rem] rounded-[1.75rem] border border-white/50 bg-white/40 p-5 shadow-lg backdrop-blur-md transition-all duration-500 hover:shadow-xl sm:max-w-sm sm:p-6 dark:border-slate-700/50 dark:bg-slate-800/40">
                    <div className="flex flex-col items-center text-center">
                      <button
                        type="button"
                        className="group floating-slow mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg transition-all duration-500 ease-out hover:-translate-y-2 hover:rotate-6 hover:shadow-2xl hover:shadow-gray-400/50 sm:mb-5 sm:h-28 sm:w-28 sm:rounded-[1.75rem]"
                        onClick={() => handleAvatarClick(member)}
                      >
                        {memberAvatars[member.name] ? (
                          <img
                            src={buildMediaUrl(memberAvatars[member.name])}
                            alt={member.name}
                            className="h-full w-full object-cover transition-all duration-300 group-hover:brightness-110 group-hover:contrast-105"
                            onError={(event) => {
                              event.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-3xl font-bold text-white transition-all duration-300 group-hover:scale-110 sm:text-4xl">
                            {member.name.split(' ').map((name) => name[0]).join('')}
                          </span>
                        )}
                      </button>

                      <h3 className="mb-2 text-xl font-bold leading-tight text-slate-900 sm:text-2xl dark:text-white">
                        {member.name}
                      </h3>
                      <p className="mb-3 text-sm font-semibold text-emerald-600 sm:mb-4 sm:text-base dark:text-emerald-400">
                        {member.role}
                      </p>
                      <p className="text-sm leading-relaxed text-slate-600 sm:text-[0.95rem] dark:text-slate-400">
                        {member.description}
                      </p>

                      {member.studentCode ? (
                        <button
                          type="button"
                          onClick={() => handleAvatarClick(member)}
                          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-emerald-300/70 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/20 sm:mt-5 sm:px-4 sm:text-sm dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/15"
                        >
                          Открыть профиль
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <button
          onClick={prevSlide}
          className="interactive-lift flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/40 shadow-lg backdrop-blur-md transition-all duration-500 hover:bg-white/60 sm:h-11 sm:w-11 dark:border-slate-700/50 dark:bg-slate-800/40 dark:hover:bg-slate-800/60"
        >
          <span className="text-xl text-slate-900 dark:text-white">‹</span>
        </button>
        <div className="flex gap-1.5 sm:gap-2">
          {safeTeamMembers.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? 'w-6 bg-gray-500/60 sm:w-8'
                  : 'bg-gray-300/40 hover:bg-gray-400/60 dark:bg-gray-600/40 dark:hover:bg-gray-500/60'
              }`}
            />
          ))}
        </div>
        <button
          onClick={nextSlide}
          className="interactive-lift flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/40 shadow-lg backdrop-blur-md transition-all duration-500 hover:bg-white/60 sm:h-11 sm:w-11 dark:border-slate-700/50 dark:bg-slate-800/40 dark:hover:bg-slate-800/60"
        >
          <span className="text-xl text-slate-900 dark:text-white">›</span>
        </button>
      </div>

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
