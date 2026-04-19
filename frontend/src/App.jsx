import React, { useEffect, useState } from 'react';
import NotFoundPage from './components/NotFoundPage.jsx';
import BannedPage from './components/BannedPage.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import ProfileSettings from './components/ProfileSettings.jsx';
import PrivacyPolicy from './components/PrivacyPolicy.jsx';
import FeatureCard from './components/FeatureCard.jsx';
import TeamCarousel from './components/TeamCarousel.jsx';
import { MissionSection, CTASection } from './components/AboutPage.jsx';
import { features, teamMembers } from './utils/constants.js';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { ModalProvider, useModal } from './contexts/ModalContext.jsx';
import { API_ENDPOINTS } from './config/api.js';
import { gamesData, gameCategories } from './config/games.js';
import { safeGetItem, safeRemoveItem, safeSetItem } from './utils/storage.js';
import { useTheme } from './hooks/useTheme.js';
import { useNavigation } from './hooks/useNavigation.js';
import { useUserMedia } from './hooks/useUserMedia.js';
import { SchedulePage } from './pages/SchedulePage.jsx';
import { LiteraturePage } from './pages/LiteraturePage.jsx';
import { NewsPage } from './pages/NewsPage.jsx';
import { GamesPage } from './pages/GamesPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { AppShell } from './components/app/AppShell.jsx';
import { ModalRoot } from './components/ModalRoot.jsx';

const DEFAULT_MISSION_STATS = {
  totalUsers: 1000,
  facultiesCount: 10,
  uptime: '99.9%',
};

function AppContent() {
  const { loading, isAuthenticated, user, logout, requires2FA } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const { activeTab, setActiveTab, searchQuery, setSearchQuery } = useNavigation();
  const {
    isLoginModalOpen,
    setIsLoginModalOpen,
    isSupportModalOpen,
    setIsSupportModalOpen,
    isInstructionModalOpen,
    isProfileModalOpen,
    setIsProfileModalOpen,
    isProfileSettingsOpen,
    setIsProfileSettingsOpen,
    setIs2FAModalOpen,
    setIs2FASetupModalOpen,
    isCategoryModalOpen,
    isSortModalOpen,
  } = useModal();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [missionStats, setMissionStats] = useState(DEFAULT_MISSION_STATS);
  const [isMissionLoading, setIsMissionLoading] = useState(false);
  const [selectedGameCategory, setSelectedGameCategory] = useState('all');

  const userMedia = useUserMedia(isAuthenticated, user, isProfileModalOpen);

  const filteredGames = gamesData.filter((item) => (
    selectedGameCategory === 'all' || item.category === selectedGameCategory
  ));

  useEffect(() => {
    const loadMissionStats = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.PUBLIC_STATS, {
          credentials: 'include',
        });

        if (!response.ok) {
          setMissionStats(DEFAULT_MISSION_STATS);
          return;
        }

        const data = await response.json();
        if (data.success && data.stats) {
          setMissionStats({
            totalUsers: data.stats.totalUsers || DEFAULT_MISSION_STATS.totalUsers,
            facultiesCount: data.stats.facultiesCount || DEFAULT_MISSION_STATS.facultiesCount,
            uptime: DEFAULT_MISSION_STATS.uptime,
          });
          return;
        }

        setMissionStats(DEFAULT_MISSION_STATS);
      } catch {
        setMissionStats(DEFAULT_MISSION_STATS);
      } finally {
        setIsMissionLoading(false);
      }
    };

    loadMissionStats();
  }, []);

  useEffect(() => {
    const currentPath = window.location.pathname;
    const validPaths = ['/', '/home', '/schedule', '/literature', '/news', '/games'];
    const isValidPath = validPaths.some(
      (path) => currentPath === path || currentPath.startsWith(`${path}/`),
    );

    if (!isValidPath && currentPath !== '/') {
      setActiveTab('404');
    }
  }, [setActiveTab]);

  useEffect(() => {
    if (!loading) {
      setIsBanned(Boolean(isAuthenticated && user?.is_banned));
    }
  }, [isAuthenticated, loading, user]);

  useEffect(() => {
    if (activeTab !== 'home') {
      safeSetItem('activeTab', activeTab);
    } else {
      safeRemoveItem('activeTab');
    }

    if (activeTab === 'support') {
      setIsSupportModalOpen(true);
      setActiveTab('home');
    } else if (activeTab === 'login') {
      setIsLoginModalOpen(true);
      setActiveTab('home');
    }
  }, [activeTab, setActiveTab, setIsLoginModalOpen, setIsSupportModalOpen]);

  useEffect(() => {
    const shouldOpenProfileModal = safeGetItem('openProfileModal', false);
    if (shouldOpenProfileModal) {
      setIsProfileModalOpen(true);
      safeRemoveItem('openProfileModal');
    }
  }, [setIsProfileModalOpen]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    setIsAdmin(Boolean(user.is_admin));
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (requires2FA) {
      setIs2FAModalOpen(true);
    }
  }, [requires2FA, setIs2FAModalOpen]);

  useEffect(() => {
    if (isProfileSettingsOpen && isProfileModalOpen) {
      setIsProfileModalOpen(false);
    }
  }, [isProfileModalOpen, isProfileSettingsOpen, setIsProfileModalOpen]);

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

  const renderActivePage = () => {
    if (activeTab === 'home') {
      return (
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
      );
    }

    if (activeTab === 'admin' && isAdmin) {
      return <AdminPanel darkMode={darkMode} />;
    }

    if (activeTab === '404') {
      return <NotFoundPage setActiveTab={setActiveTab} />;
    }

    if (activeTab === 'privacy') {
      return <PrivacyPolicy setActiveTab={setActiveTab} />;
    }

    if (activeTab === 'schedule') {
      return <SchedulePage />;
    }

    if (activeTab === 'literature') {
      return (
        <LiteraturePage
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeTab={activeTab}
        />
      );
    }

    if (activeTab === 'news') {
      return <NewsPage activeTab={activeTab} />;
    }

    if (activeTab === 'games') {
      return (
        <GamesPage
          gameCategories={gameCategories}
          selectedGameCategory={selectedGameCategory}
          setSelectedGameCategory={setSelectedGameCategory}
          filteredGames={filteredGames}
        />
      );
    }

    return null;
  };

  return (
    <div className={`${darkMode ? 'dark' : ''} min-h-screen flex flex-col font-sans selection:bg-emerald-500 selection:text-white`}>
      <div className="flex-1 bg-gray-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 transition-colors duration-500 relative flex flex-col">
        {isBanned ? (
          <BannedPage />
        ) : isProfileSettingsOpen ? (
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
        ) : (
          <AppShell
            hideHeader={
              isLoginModalOpen ||
              isSupportModalOpen ||
              isInstructionModalOpen ||
              isCategoryModalOpen ||
              isSortModalOpen ||
              isProfileModalOpen
            }
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
          >
            {renderActivePage()}
          </AppShell>
        )}
        <ModalRoot />
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
