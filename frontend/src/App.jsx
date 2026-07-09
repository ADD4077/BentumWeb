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
import { EventsPage } from './pages/EventsPage.jsx';
import { NotificationsPage } from './pages/NotificationsPage.jsx';
import { GamesPage } from './pages/GamesPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { ChairpersonPage } from './pages/ChairpersonPage.jsx';
import { AppShell } from './components/app/AppShell.jsx';
import { ModalRoot } from './components/ModalRoot.jsx';

const GUEST_ALLOWED_TABS = new Set(['home', 'support', 'privacy', 'events', '404']);

function resolveAccessibleTab(tab, { loading, isAuthenticated, isAdmin, canModerate, canOpenChairperson }) {
  if (loading) {
    return GUEST_ALLOWED_TABS.has(tab) ? tab : 'home';
  }

  if (!isAuthenticated) {
    return GUEST_ALLOWED_TABS.has(tab) ? tab : 'home';
  }

  if (tab === 'admin' && !isAdmin) {
    return 'home';
  }

  if (tab === 'moder' && !canModerate) {
    return 'home';
  }

  if (tab === 'chairperson' && !canOpenChairperson) {
    return 'home';
  }

  return tab;
}

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
  const isBanned = Boolean(!loading && user?.is_banned);
  const isAdmin = Boolean(isAuthenticated && user?.is_admin);
  const canModerate = Boolean(isAuthenticated && (user?.role === 'moderator' || user?.is_admin));
  const canOpenChairperson = Boolean(isAuthenticated && (user?.role === 'chairperson' || user?.is_admin));
  const visibleTab = useMemo(() => resolveAccessibleTab(activeTab, {
    loading,
    isAuthenticated,
    isAdmin,
    canModerate,
    canOpenChairperson,
  }), [activeTab, loading, isAuthenticated, isAdmin, canModerate, canOpenChairperson]);

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
    activeTab: visibleTab,
    setActiveTab,
    setIsLoginModalOpen,
    setIsProfileModalOpen,
    isProfileSettingsOpen,
    isProfileModalOpen,
    requires2FA,
    setIs2FAModalOpen,
  });

  useEffect(() => {
    if (activeTab !== visibleTab) {
      setActiveTab(visibleTab);
    }
  }, [activeTab, visibleTab, setActiveTab]);

  const renderActivePage = () => {
    if (visibleTab === 'home') {
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

    if (visibleTab === 'admin' && isAdmin) {
      return <AdminPanel darkMode={darkMode} setActiveTab={setActiveTab} />;
    }

    if (visibleTab === 'moder' && canModerate) {
      return <ModeratorSupportPage darkMode={darkMode} />;
    }

    if (visibleTab === 'chairperson' && canOpenChairperson) {
      return <ChairpersonPage setActiveTab={setActiveTab} />;
    }

    if (visibleTab === 'support') {
      return <SupportPage setIsLoginModalOpen={setIsLoginModalOpen} />;
    }

    if (visibleTab === '404') {
      return <NotFoundPage setActiveTab={setActiveTab} />;
    }

    if (visibleTab === 'privacy') {
      return <PrivacyPolicy setActiveTab={setActiveTab} />;
    }

    if (visibleTab === 'schedule') {
      return <SchedulePage />;
    }

    if (visibleTab === 'literature') {
      return (
        <LiteraturePage
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          activeTab={visibleTab}
        />
      );
    }

    if (visibleTab === 'news') {
      return <NewsPage activeTab={visibleTab} />;
    }

    if (visibleTab === 'events') {
      return (
        <EventsPage
          activeTab={visibleTab}
          setIsLoginModalOpen={setIsLoginModalOpen}
          darkMode={darkMode}
        />
      );
    }

    if (visibleTab === 'notifications') {
      return <NotificationsPage setActiveTab={setActiveTab} />;
    }

    if (visibleTab === 'profile') {
      return (
        <ProfilePage setActiveTab={setActiveTab} userMedia={userMedia} />
      );
    }

    if (visibleTab === 'games') {
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

  const openNotificationsPage = () => {
    setIsProfileModalOpen(false);
    setIsProfileSettingsOpen(false);
    setIsMobileMenuOpen(false);
    setActiveTab('notifications');
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
            activeTab={visibleTab}
            setActiveTab={setActiveTab}
            darkMode={darkMode}
            toggleTheme={toggleTheme}
            setIsLoginModalOpen={setIsLoginModalOpen}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            isProfileModalOpen={isProfileModalOpen}
            setIsProfileModalOpen={setIsProfileModalOpen}
            onOpenNotificationsPage={openNotificationsPage}
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
