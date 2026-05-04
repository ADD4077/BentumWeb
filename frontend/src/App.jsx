import React, { useEffect, useMemo, useState } from 'react';
import NotFoundPage from './components/NotFoundPage.jsx';
import BannedPage from './components/BannedPage.jsx';
import AdminPanel from './components/AdminPanel.jsx';
import ModeratorSupportPage from './components/ModeratorSupportPage.jsx';
import SupportPage from './components/SupportPage.jsx';
import ProfileSettings from './components/ProfileSettings.jsx';
import PrivacyPolicy from './components/PrivacyPolicy.jsx';
import FeatureCard from './components/FeatureCard.jsx';
import TeamCarousel from './components/TeamCarousel.jsx';
import { MissionSection, CTASection } from './components/AboutPage.jsx';
import { features } from './utils/constants.js';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { ModalProvider, useModal } from './contexts/ModalContext.jsx';
import { gamesData, gameCategories } from './config/games.js';
import { fetchDevTeamMembers } from './services/devTeam.js';
import { useTheme } from './hooks/useTheme.js';
import { useNavigation } from './hooks/useNavigation.js';
import { useUserMedia } from './hooks/useUserMedia.js';
import { useMissionStats } from './hooks/useMissionStats.js';
import { useAppSideEffects } from './hooks/useAppSideEffects.js';
import { SchedulePage } from './pages/SchedulePage.jsx';
import { LiteraturePage } from './pages/LiteraturePage.jsx';
import { NewsPage } from './pages/NewsPage.jsx';
import { GamesPage } from './pages/GamesPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { AppShell } from './components/app/AppShell.jsx';
import { ModalRoot } from './components/ModalRoot.jsx';

function AppContent() {
  const { loading, isAuthenticated, user, logout, requires2FA } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
  const { activeTab, setActiveTab, searchQuery, setSearchQuery } = useNavigation();
  const {
    isLoginModalOpen,
    setIsLoginModalOpen,
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
  const [selectedGameCategory, setSelectedGameCategory] = useState('all');
  const [teamMembers, setTeamMembers] = useState([]);

  const userMedia = useUserMedia(isAuthenticated, user, isProfileModalOpen);
  const { missionStats, isMissionLoading } = useMissionStats();
  const isBanned = Boolean(!loading && isAuthenticated && user?.is_banned);
  const isAdmin = Boolean(isAuthenticated && user?.is_admin);
  const canModerate = Boolean(isAuthenticated && (user?.role === 'moderator' || user?.is_admin));

  const filteredGames = useMemo(() => gamesData.filter((item) => (
    selectedGameCategory === 'all' || item.category === selectedGameCategory
  )), [selectedGameCategory]);

  useEffect(() => {
    let cancelled = false;

    const loadDevTeam = async () => {
      const members = await fetchDevTeamMembers();
      if (!cancelled) {
        setTeamMembers(members);
      }
    };

    loadDevTeam();

    return () => {
      cancelled = true;
    };
  }, []);

  useAppSideEffects({
    activeTab,
    setActiveTab,
    setIsLoginModalOpen,
    setIsProfileModalOpen,
    isProfileSettingsOpen,
    isProfileModalOpen,
    requires2FA,
    setIs2FAModalOpen,
  });

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
      return <AdminPanel darkMode={darkMode} setActiveTab={setActiveTab} />;
    }

    if (activeTab === 'moder' && canModerate) {
      return <ModeratorSupportPage darkMode={darkMode} />;
    }

    if (activeTab === 'support') {
      return <SupportPage setIsLoginModalOpen={setIsLoginModalOpen} />;
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
    <div className={`${darkMode ? 'dark' : ''} app-stage min-h-screen flex flex-col font-sans selection:bg-emerald-500 selection:text-white`}>
      <div className="flex-1 bg-slate-100 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 transition-colors duration-500 relative flex flex-col">
        {isBanned && activeTab !== 'support' ? (
          <BannedPage setActiveTab={setActiveTab} />
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
