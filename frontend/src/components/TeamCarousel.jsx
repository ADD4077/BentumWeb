// TeamCarousel компонент - карусель с командой
import React, { useState, useEffect, useRef } from 'react';

function TeamCarousel({ teamMembers }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  const startAutoPlay = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === teamMembers.length - 1 ? 0 : prevIndex + 1
      );
    }, 4000); // Меняем слайд каждые 4 секунды
  };

  const stopAutoPlay = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const resumeAutoPlay = () => {
    stopAutoPlay();
    timeoutRef.current = setTimeout(() => {
      setIsAutoPlaying(true);
      startAutoPlay();
    }, 8000); // Задержка 8 секунд после ручного переключения
  };

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === teamMembers.length - 1 ? 0 : prevIndex + 1
    );
    resumeAutoPlay();
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? teamMembers.length - 1 : prevIndex - 1
    );
    resumeAutoPlay();
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
    resumeAutoPlay();
  };

  useEffect(() => {
    if (isAutoPlaying && teamMembers.length > 1) {
      startAutoPlay();
    }

    return () => {
      stopAutoPlay();
    };
  }, [isAutoPlaying, teamMembers.length]);

  return (
    <div className="w-full max-w-6xl mx-auto mt-20">
      <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-12">
        Наша команда
      </h2>
      
      <div className="relative">
        {/* Основной слайдер */}
        <div className="overflow-hidden rounded-2xl max-w-4xl mx-auto" style={{ padding: '20px' }}>
          <div 
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {teamMembers.map((member, index) => (
              <div key={index} className="w-full flex-shrink-0 px-4">
                <div className="max-w-md mx-auto bg-white/40 dark:bg-slate-800/40 border border-white/50 dark:border-slate-700/50 rounded-3xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-md">
                  
                  {/* Центрированный контент */}
                  <div className="flex flex-col items-center text-center">
                    
                    {/* Фото участника */}
                    <div className="w-32 h-32 rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg flex items-center justify-center mb-6 transition-all duration-300 ease-out transform translate-y-0 rotate-0 hover:shadow-2xl hover:shadow-gray-400/50 group cursor-pointer hover:-translate-y-2 hover:rotate-6">
                      {member.image ? (
                        <img 
                          src={member.image} 
                          alt={member.name}
                          className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-110 group-hover:contrast-105"
                        />
                      ) : (
                        <span className="text-white text-4xl font-bold transition-all duration-300 group-hover:text-white group-hover:scale-110">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      )}
                    </div>
                    
                    {/* Имя */}
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                      {member.name}
                    </h3>
                    
                    {/* Должность */}
                    <p className="text-emerald-600 dark:text-emerald-400 font-semibold mb-4">
                      {member.role}
                    </p>
                    
                    {/* Описание */}
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

      {/* Кнопки навигации и индикаторы на одном уровне */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={prevSlide}
          className="w-12 h-12 bg-white/40 dark:bg-slate-800/40 border border-white/50 dark:border-slate-700/50 rounded-full flex items-center justify-center shadow-lg hover:bg-white/60 dark:hover:bg-slate-800/60 transition-all duration-300 backdrop-blur-md"
        >
          <span className="text-slate-900 dark:text-white text-xl">‹</span>
        </button>
        
        {/* Индикаторы */}
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
    </div>
  );
}

export default TeamCarousel;
