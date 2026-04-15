import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import NotFoundPage from './components/NotFoundPage.jsx';
import BannedPage from './components/BannedPage.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import ProfileSettings from './components/ProfileSettings.jsx';
import PrivacyPolicy from './components/PrivacyPolicy.jsx';
import FeatureCard from './components/FeatureCard.jsx';
import TeamCarousel from './components/TeamCarousel.jsx';
import { MissionSection, CTASection } from './components/AboutPage.jsx';
import { Moon, Search, Settings, LogOut, User } from 'lucide-react';
import { features, teamMembers } from './utils/constants.js';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { ModalProvider, useModal } from './contexts/ModalContext.jsx';
import { API_ENDPOINTS } from './config/api.js';
import { safeLogout } from './utils/navigation.js';

import { safeGetItem, safeSetItem, safeRemoveItem } from './utils/storage.js';
import { useTheme } from './hooks/useTheme.js';
import { useNavigation } from './hooks/useNavigation.js';
import { useUserMedia } from './hooks/useUserMedia.js';
import { SchedulePage } from './pages/SchedulePage.jsx';
import { LiteraturePage } from './pages/LiteraturePage.jsx';
import { NewsPage } from './pages/NewsPage.jsx';
import { GamesPage } from './pages/GamesPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { ModalRoot } from './components/ModalRoot.jsx';

function AppContent() {
  const { loading, isAuthenticated, user, logout, requires2FA, verify2FA, checkAuth, remainingTime } = useAuth();
  const { setRequires2FA } = useAuth();
  
  // Используем кастомные хуки
  const { darkMode, toggleTheme } = useTheme();
  const { activeTab, setActiveTab, searchQuery, setSearchQuery } = useNavigation();
  const {
    isLoginModalOpen, setIsLoginModalOpen,
    isSupportModalOpen, setIsSupportModalOpen,
    isSupportSuccessModalOpen, setIsSupportSuccessModalOpen,
    isInstructionModalOpen, setIsInstructionModalOpen,
    isProfileModalOpen, setIsProfileModalOpen,
    isProfileEditModalOpen, setIsProfileEditModalOpen,
    isProfileSettingsOpen, setIsProfileSettingsOpen,
    is2FAModalOpen,
    is2FASetupModalOpen,
    setIs2FASetupModalOpen,
    isCategoryModalOpen,
    isSortModalOpen,
    closeAllModals
  } = useModal();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [missionStats, setMissionStats] = useState({
    totalUsers: 1000,
    facultiesCount: 10,
    uptime: '99.9%'
  });
  const [isMissionLoading, setIsMissionLoading] = useState(false);

  // Пользовательские медиа
  const userMedia = useUserMedia(isAuthenticated, user, isProfileModalOpen);

  // Загрузка статистики для миссии
  const loadMissionStats = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.PUBLIC_STATS, {
        credentials: 'include'
      });

      const defaultStats = {
        totalUsers: 1000,
        facultiesCount: 10,
        uptime: '99.9%'
      };

      if (!response.ok) {
        setMissionStats(defaultStats);
        setIsMissionLoading(false);
        return;
      }

      const data = await response.json();

      if (data.success && data.stats) {
        setMissionStats({
          totalUsers: data.stats.totalUsers || 1000,
          facultiesCount: data.stats.facultiesCount || 10,
          uptime: '99.9%'
        });
      } else {
        setMissionStats(defaultStats);
      }
    } catch (error) {
      setMissionStats({
        totalUsers: 1000,
        facultiesCount: 10,
        uptime: '99.9%'
      });
    } finally {
      setIsMissionLoading(false);
    }
  };

  useEffect(() => {
    loadMissionStats();
  }, []);
  
  // Определяем 404 страницу на основе URL
  useEffect(() => {
    const currentPath = window.location.pathname;
    const validPaths = ['/', '/home', '/schedule', '/literature', '/news', '/games'];
    const isValidPath = validPaths.some(path => 
      currentPath === path || currentPath.startsWith(path + '/')
    );
    
    if (!isValidPath && currentPath !== '/') {
      setActiveTab('404');
    }
  }, []);

  // Проверка статуса блокировки пользователя
  useEffect(() => {
    const checkBannedStatus = () => {
      // Если пользователь авторизован и забанен, показываем страницу бана
      if (isAuthenticated && user?.is_banned) {
        setIsBanned(true);
      } else {
        setIsBanned(false);
      }
    };

    if (!loading) {
      checkBannedStatus();
    }
  }, [isAuthenticated, user, loading]);

  // Объединенный useEffect для всех операций с activeTab
  useEffect(() => {
    // Сохраняем activeTab в localStorage
    if (activeTab !== 'home') {
      safeSetItem('activeTab', activeTab);
    } else {
      safeRemoveItem('activeTab');
    }
    
    // Автоматически открываем модальные окна в зависимости от activeTab
    if (activeTab === 'support') {
      setIsSupportModalOpen(true);
      setActiveTab('home'); // Сбрасываем чтобы не открывать снова
    } else if (activeTab === 'login') {
      setIsLoginModalOpen(true);
      setActiveTab('home'); // Сбрасываем чтобы не открывать снова
    }
  }, [activeTab]);

  // Автоматически открываем модальное окно профиля если установлен флаг
  useEffect(() => {
    const shouldOpenProfileModal = safeGetItem('openProfileModal', false);
    if (shouldOpenProfileModal) {
      setIsProfileModalOpen(true);
      // Очищаем флаг после использования
      safeRemoveItem('openProfileModal');
    }
  }, []);

  // Проверка прав администратора
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    // Проверяем права администратора по данным от сервера
    if (user.is_admin) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [isAuthenticated, user]);

  // Автоматически открываем 2FA модальное окно если требуется
  useEffect(() => {
    if (requires2FA) {
      setIs2FAModalOpen(true);
    }
  }, [requires2FA]);

  // Читаем данные из URL параметров при первой загрузке
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');
    const tokenParam = urlParams.get('token');
    const banEndDateParam = urlParams.get('banEndDate');
    
    if (userParam && tokenParam) {
      try {
        const user = JSON.parse(userParam);
        safeSetItem('user', user);
        safeSetItem('token', tokenParam);
        if (banEndDateParam) {
          safeSetItem('banEndDate', banEndDateParam);
        }
        
        // Очищаем URL чтобы параметры не оставались в адресной строке
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Перезагружаем страницу для применения новых данных
        window.location.reload();
      } catch (error) {
        console.warn('Ошибка при обработке URL параметров:', error);
      }
    }
  }, []);

  // Game category state (static data, no API)
  const [selectedGameCategory, setSelectedGameCategory] = useState('all');

  // Games data (static)
  const gamesData = [
    {
      id: 0,
      title: "Minecraft Server",
      developer: "BNTU Community",
      category: "survival",
      price: 0,
      originalPrice: null,
      discount: 0,
      rating: 4.9,
      image: "/src/assets/games/Minecraft/banner.png",
      description: "Официальный Minecraft сервер студентов БНТУ. Выживание, мини-игры и дружное сообщество!",
      tags: ["Выживание", "Мультиплеер", "Бесплатно", "Сообщество"],
      featured: true,
      serverUrl: "https://serverbntu.ru/",
      serverIP: "serverbntu.ru"
    }
  ];
  const gameCategories = [
    { id: 'all', name: 'Все игры' }
  ];
  // Scroll tracking
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      html { scrollbar-gutter: stable; }
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
      }
      @keyframes colorShift {
        0% { background-position: 100% 50%; }
        50% { background-position: 0% 50%; }
        100% { background-position: 100% 50%; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  // Literature categories (used by hook)
  const literatureCategories = [
    { id: 'all', name: 'Все' },
    { id: 'Автомобили', name: 'Автомобили' },
    { id: 'Гидропневмоавтоматика и гидропневмопривод', name: 'Гидропневматика' },
    { id: 'Двигатели внутреннего сгорания', name: 'Двигатели' },
    { id: 'Инженерная графика машиностроительного профиля', name: 'Инженерная графика' },
    { id: 'Коммерческая деятельность и бухгалтерский учет на транспорте', name: 'Коммерческая деятельность' },
    { id: 'Техническая эксплуатация автомобилей', name: 'Техническая эксплуатация' },
    { id: 'Тракторы', name: 'Тракторы' },
    { id: 'Транспортные системы и технологии', name: 'Транспортные системы' },
    { id: 'Экономика и логистика', name: 'Экономика и логистика' },
    { id: 'Английский язык №1', name: 'Английский язык' },
    { id: 'Горные машины', name: 'Горные машины' },
    { id: 'Горные работы', name: 'Горные работы' },
    { id: 'Инженерная экология', name: 'Инженерная экология' },
    { id: 'Инженерная экономика', name: 'Инженерная экономика' },
    { id: 'Машиноведение и детали машин', name: 'Машиноведение' },
    { id: 'Мехатроника и искусственный интеллект', name: 'Мехатроника' },
    { id: 'Теоретическая механика и механика материалов', name: 'Теоретическая механика' },
    { id: 'Технологическое оборудование', name: 'Технологическое оборудование' },
    { id: 'Технология машиностроения', name: 'Технология машиностроения' },
    { id: 'Материаловедение в машиностроении', name: 'Материаловедение' },
    { id: 'Машины и технология литейного производства', name: 'Литейное производство' },
    { id: 'Машины и технология обработки металлов давлением', name: 'Обработка металлов' },
    { id: 'Металлургические технологии', name: 'Металлургические технологии' },
    { id: 'Металлургия черных и цветных сплавов', name: 'Металлургия сплавов' },
    { id: 'Охрана труда', name: 'Охрана труда' },
    { id: 'Порошковая металлургия, сварка и технология материалов', name: 'Порошковая металлургия' },
    { id: 'Бизнес-администрирование', name: 'Бизнес-администрирование' },
    { id: 'Маркетинг', name: 'Маркетинг' },
    { id: 'Межкультурная профессиональная коммуникация', name: 'Межкультурная коммуникация' },
    { id: 'Торговое и рекламное оборудование', name: 'Торговое оборудование' },
    { id: 'Экономика и управление инновационными проектами в промышленности', name: 'Экономика инноваций' },
    { id: 'Промышленная теплоэнергетика и теплотехника', name: 'Промышленная теплоэнергетика' },
    { id: 'Тепловые электрические станции', name: 'Тепловые электростанции' },
    { id: 'Экономика и организация энергетики', name: 'Экономика энергетики' },
    { id: 'Электрические системы', name: 'Электрические системы' },
    { id: 'Электрические станции', name: 'Электрические станции' },
    { id: 'Электроснабжение', name: 'Электроснабжение' },
    { id: 'Электротехника и электроника', name: 'Электротехника' },
    { id: 'Высшая математика', name: 'Высшая математика' },
    { id: 'Программное обеспечение информационных систем и технологий', name: 'Программное обеспечение' }
];

  // Note: literature state now managed by useLiterature hook
  // Note: news state now managed by useNews hook
  // Note: userMedia now managed by useUserMedia hook

  // Games filtering
  const filteredGames = gamesData.filter(item => {
    return selectedGameCategory === 'all' || item.category === selectedGameCategory;
  });

  // Utility functions
  const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    const options = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    let formatted = date.toLocaleDateString('ru-RU', options);
    return formatted.replace(' г. в', '');
};

return (
    <div className={`${darkMode ? 'dark' : ''} min-h-screen flex flex-col font-sans selection:bg-emerald-500 selection:text-white`}>
      <div className="flex-1 bg-gray-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 transition-colors duration-500 relative flex flex-col">
        {/* Если пользователь заблокирован, показываем страницу бана */}
        {isBanned ? (
          <BannedPage />
        ) : isProfileSettingsOpen ? (
          (() => {
            // Закрываем модальное окно профиля при открытии настроек
            if (isProfileModalOpen) {
              setIsProfileModalOpen(false);
            }
            return (
              <ProfileSettings 
                darkMode={darkMode}
                onBack={() => setIsProfileSettingsOpen(false)}
                user={user}
                userMedia={userMedia}
                onProfileUpdate={userMedia.handleProfileUpdate}
                onForceRefresh={userMedia.forceRefresh}
                on2FASetupOpen={() => setIs2FASetupModalOpen(true)}
                onLogout={() => {
                  logout();
                  setActiveTab('home');
                  setIsProfileSettingsOpen(false);
                }}
              />
            );
          })()
        ) : (
          <>
            {!isLoginModalOpen && !isSupportModalOpen && !isInstructionModalOpen && !isCategoryModalOpen && !isSortModalOpen && !isProfileModalOpen && (
              <Header 
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                darkMode={darkMode}
                toggleTheme={toggleTheme}
                setIsLoginModalOpen={setIsLoginModalOpen}
                setIsSupportModalOpen={setIsSupportModalOpen}
                isMobileMenuOpen={isMobileMenuOpen}
                setIsMobileMenuOpen={setIsMobileMenuOpen}
                isProfileModalOpen={isProfileModalOpen}
                setIsProfileModalOpen={setIsProfileModalOpen}
                userMedia={userMedia}
              />
            )}
            <main className="container mx-auto px-4 pt-8 pb-12 relative z-10 flex-1">
              {activeTab === 'home' && (
                <HomePage
                  isAuthenticated={isAuthenticated}
                  setIsLoginModalOpen={setIsLoginModalOpen}
                  features={features}
                  FeatureCard={FeatureCard}
                  missionStats={missionStats}
                  isMissionLoading={isMissionLoading}
                  MissionSection={MissionSection}
                  teamMembers={teamMembers}
                  TeamCarousel={TeamCarousel}
                  CTASection={CTASection}
                  setActiveTab={setActiveTab}
                  darkMode={darkMode}
                />
              )}
          {activeTab === 'admin' && isAdmin && (
            <AdminPanel darkMode={darkMode} />
          )}
          {activeTab === '404' && (
            <NotFoundPage setActiveTab={setActiveTab} />
          )}
          {activeTab === 'privacy' && (
            <PrivacyPolicy setActiveTab={setActiveTab} />
          )}
          {activeTab === 'schedule' && <SchedulePage />}
          {activeTab === 'literature' && (
            <LiteraturePage
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              activeTab={activeTab}
            />
          )}
          <ModalRoot />
          {activeTab === 'news' && (
            <NewsPage activeTab={activeTab} />
          )}
          {activeTab === 'games' && (
            <GamesPage
              gameCategories={gameCategories}
              selectedGameCategory={selectedGameCategory}
              setSelectedGameCategory={setSelectedGameCategory}
              filteredGames={filteredGames}
            />
          )}
        </main>
        <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center text-sm text-slate-500 dark:text-slate-400">
              <p> © 2026 Бентум. Все права защищены. </p>
            </div>
          </div>
        </footer>
          </>
        )}
      </div>
    </div>
  );
}
function App() {
  return (
    <AuthProvider>
      <ModalProvider>
        <AppContent />
      </ModalProvider>
    </AuthProvider>
  );
}
export default App;
