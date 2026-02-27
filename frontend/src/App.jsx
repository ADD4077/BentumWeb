import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import ScheduleItem from './components/ScheduleItem.jsx';
import LoginModal from './components/LoginModal.jsx';
import FeatureCard from './components/FeatureCard.jsx';
import TeamCarousel from './components/TeamCarousel.jsx';
import { Star, LogIn, ChevronRight, BookOpen, Download, ExternalLink, Search, Filter, Calendar, Clock, User, Tag, ArrowRight, Gamepad2, Trophy, Zap, Target, Brain, Heart } from 'lucide-react';
import { scheduleData } from './data/scheduleData.js';
import { daysOfWeek, groupInfo, features, teamMembers } from './utils/constants.js';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';

function AppContent() {
  const [darkMode, setDarkMode] = useState(() => {
    // Восстанавливаем тему из localStorage при загрузке
    const savedTheme = localStorage.getItem('darkMode');
    return savedTheme !== null ? JSON.parse(savedTheme) : true;
  });
  const [activeTab, setActiveTab] = useState('home'); 
  const [weekType, setWeekType] = useState('upper');
  const [selectedDay, setSelectedDay] = useState('Пн');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedNewsCategory, setSelectedNewsCategory] = useState('all');
  const [selectedGameCategory, setSelectedGameCategory] = useState('all');
  const [gameScores, setGameScores] = useState({});
  const { loading, isAuthenticated, user } = useAuth();

  useEffect(() => {
    const today = new Date().getDay();
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    if (today !== 0) setSelectedDay(days[today]);
    else setSelectedDay('Пн');

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Инициализация темы при загрузке
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Сохраняем тему в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Добавление CSS анимации
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

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    // Добавляем/убираем класс dark у html элемента
    if (!darkMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  };

  const currentSchedule = scheduleData[weekType][selectedDay] || [];

  // Literature data
  const literatureData = [
    {
      id: 1,
      title: "Высшая математика. Курс лекций",
      author: "П.Е. Данко, А.Г. Попов",
      category: "mathematics",
      type: "textbook",
      year: 2020,
      description: "Полный курс высшей математики для студентов технических вузов. Содержит теоретический материал и практические задания.",
      url: "#",
      downloadUrl: "#"
    },
    {
      id: 2,
      title: "Физика. Учебное пособие",
      author: "И.В. Савельев",
      category: "physics",
      type: "textbook",
      year: 2019,
      description: "Фундаментальный курс физики, охватывающий все разделы общей и теоретической физики.",
      url: "#",
      downloadUrl: "#"
    },
    {
      id: 3,
      title: "Сопротивление материалов",
      author: "Н.М. Беляев",
      category: "mechanics",
      type: "textbook",
      year: 2021,
      description: "Классический учебник по сопротивлению материалов с примерами расчетов и задачами.",
      url: "#",
      downloadUrl: "#"
    },
    {
      id: 4,
      title: "Теоретическая механика",
      author: "А.А. Яблонский",
      category: "mechanics",
      type: "textbook",
      year: 2018,
      description: "Учебное пособие по теоретической механике для студентов инженерных специальностей.",
      url: "#",
      downloadUrl: "#"
    },
    {
      id: 5,
      title: "Химия. Общая и неорганическая",
      author: "Ю.Д. Третьяков",
      category: "chemistry",
      type: "textbook",
      year: 2020,
      description: "Современный курс общей и неорганической химии с практикумом.",
      url: "#",
      downloadUrl: "#"
    },
    {
      id: 6,
      title: "Инженерная графика",
      author: "В.Г. Бородин",
      category: "engineering",
      type: "manual",
      year: 2019,
      description: "Практикум по инженерной графике и начертательной геометрии.",
      url: "#",
      downloadUrl: "#"
    }
  ];

  const categories = [
    { id: 'all', name: 'Все категории' },
    { id: 'mathematics', name: 'Математика' },
    { id: 'physics', name: 'Физика' },
    { id: 'mechanics', name: 'Механика' },
    { id: 'chemistry', name: 'Химия' },
    { id: 'engineering', name: 'Инженерные науки' }
  ];

  // Filter literature based on search and category
  const filteredLiterature = literatureData.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // News data
  const newsData = [
    {
      id: 1,
      title: "Открытие новой лаборатории робототехники в БНТУ",
      excerpt: "В Белорусском национальном техническом университете открыли современную лабораторию робототехники, оснащенную последними моделями промышленных роботов.",
      content: "В Белорусском национальном техническом университете открыли современную лабораторию робототехники, оснащенную последними моделями промышленных роботов. Новая лаборатория позволит студентам изучать передовые технологии автоматизации и программирования роботизированных систем.",
      category: "academic",
      author: "Пресс-центр БНТУ",
      date: "2024-02-25",
      imageUrl: "",
      featured: true,
      readTime: "3 мин"
    },
    {
      id: 2,
      title: "Студенты БНТУ победили в международном конкурсе IT-проектов",
      excerpt: "Команда студентов факультета информационных технологий заняла первое место в международном конкурсе инновационных IT-проектов.",
      content: "Команда студентов факультета информационных технологий заняла первое место в международном конкурсе инновационных IT-проектов. Проект посвящен разработке системы умного управления городским транспортом.",
      category: "achievements",
      author: "Отдел по работе со студентами",
      date: "2024-02-23",
      imageUrl: "",
      featured: true,
      readTime: "4 мин"
    },
    {
      id: 3,
      title: "Прием заявлений на летнюю практику 2024",
      excerpt: "Открыт прием заявлений на прохождение летней производственной практики на ведущих предприятиях страны.",
      content: "Открыт прием заявлений на прохождение летней производственной практики на ведущих предприятиях страны. Студентам предложены места на крупных промышленных предприятиях и в IT-компаниях.",
      category: "education",
      author: "Деканат",
      date: "2024-02-20",
      imageUrl: "",
      featured: false,
      readTime: "2 мин"
    },
    {
      id: 4,
      title: "День открытых дверей в БНТУ",
      excerpt: "Приглашаем абитуриентов и их родителей на день открытых дверей, который состоится 15 марта.",
      content: "Приглашаем абитуриентов и их родителей на день открытых дверей, который состоится 15 марта. Гости смогут посетить лекции, познакомиться с преподавателями и узнать о специальностях.",
      category: "events",
      author: "Приемная комиссия",
      date: "2024-02-18",
      imageUrl: "",
      featured: false,
      readTime: "3 мин"
    },
    {
      id: 5,
      title: "Новые образовательные программы в области искусственного интеллекта",
      excerpt: "БНТУ запускает новые магистерские программы по направлению 'Искусственный интеллект и машинное обучение'.",
      content: "БНТУ запускает новые магистерские программы по направлению 'Искусственный интеллект и машинное обучение'. Программы разработаны совместно с ведущими IT-компаниями.",
      category: "education",
      author: "Управление образования",
      date: "2024-02-15",
      imageUrl: "",
      featured: false,
      readTime: "5 мин"
    },
    {
      id: 6,
      title: "Спортивные достижения студентов БНТУ",
      excerpt: "Сборные команды университета завоевали призовые места в республиканских соревнованиях по баскетболу и волейболу.",
      content: "Сборные команды университета завоевали призовые места в республиканских соревнованиях по баскетболу и волейболу. Студенты показали отличные результаты и принесли славу университету.",
      category: "sports",
      author: "Спортивный отдел",
      date: "2024-02-12",
      imageUrl: "",
      featured: false,
      readTime: "2 мин"
    }
  ];

  const newsCategories = [
    { id: 'all', name: 'Все новости' },
    { id: 'academic', name: 'Академические' },
    { id: 'achievements', name: 'Достижения' },
    { id: 'education', name: 'Образование' },
    { id: 'events', name: 'Мероприятия' },
    { id: 'sports', name: 'Спорт' }
  ];

  // Filter news based on category
  const filteredNews = newsData.filter(item => {
    return selectedNewsCategory === 'all' || item.category === selectedNewsCategory;
  });

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <div className={`${darkMode ? 'dark' : ''} min-h-screen flex flex-col font-sans selection:bg-emerald-500 selection:text-white`}>
      <div className="flex-grow bg-gray-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 transition-colors duration-500 relative">
        
        {/* --- Header --- */}
        <Header 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          darkMode={darkMode}
          toggleTheme={toggleTheme}
          setIsLoginModalOpen={setIsLoginModalOpen}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />

        {/* --- Main Content --- */}
        <main className="container mx-auto px-4 pt-8 pb-12 relative z-10">
          
          {/* HOME TAB */}
          {activeTab === 'home' && (
            <div className="flex flex-col items-center">
              <div className="text-center max-w-4xl mx-auto mb-20 mt-10">
                <span className="inline-flex text-lg md:text-xl text-emerald-600 font-medium mb-4 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-500 rounded-full items-center gap-2" style={{ animation: 'float 3s ease-in-out infinite' }}>
                  <Star className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>Новая версия 2.0 уже доступна</span>
                </span>
                <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                  Умное расписание <br />
                  <span className="relative inline-block">
                  <span 
                    className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-6xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent transition-all duration-1000"
                    style={{
                      backgroundSize: '200% 100%',
                      backgroundPosition: '0% 50%',
                      animation: 'colorShift 4s ease-in-out infinite'
                    }}
                  >
                    Для студентов БНТУ
                  </span>
                </span>
                </h1>
                
                <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed max-w-2xl mx-auto">
                  Персональный ассистент, который знает, где ваша следующая пара. 
                  Уведомления, навигация по корпусам и синхронизация с группой — всё в одном месте.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  {!isAuthenticated && (
                    <button 
                      onClick={() => setIsLoginModalOpen(true)}
                      className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-3xl font-bold text-lg shadow-xl shadow-emerald-500/30 transition-all hover:-translate-y-1 flex items-center justify-center gap-2 pl-5"
                    >
                      <LogIn className="w-5 h-5" />
                      <span>Начать</span>
                    </button>
                  )}
                  <button 
                    className="w-full sm:w-auto px-8 py-4 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-gray-200 dark:border-slate-700 rounded-3xl font-bold text-lg transition-all hover:-translate-y-1 flex items-center justify-center gap-2 shadow-lg shadow-slate-200/20 dark:shadow-none"
                  >
                    <span>Узнать больше</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Features Section */}
              <div className="w-full max-w-6xl mx-auto mt-20">
                {/* Первая строка - особый макет */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                  {/* Первая карточка - прямоугольная 2:1 */}
                  <div className="lg:col-span-2">
                    <FeatureCard 
                      title={features[0].title}
                      description={features[0].description}
                    />
                  </div>
                  {/* Вторая карточка - квадратная 1:1 */}
                  <div className="lg:col-span-1">
                    <FeatureCard 
                      title={features[1].title}
                      description={features[1].description}
                    />
                  </div>
                </div>
                
                {/* Вторая строка - обычная сетка */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                  {/* Третья карточка */}
                  <FeatureCard 
                    title={features[2].title}
                    description={features[2].description}
                  />
                  {/* Четвертая карточка */}
                  <FeatureCard 
                    title={features[3].title}
                    description={features[3].description}
                  />
                </div>
              </div>

              {/* Team Carousel Section */}
              <TeamCarousel teamMembers={teamMembers} />
            </div>
          )}

          {/* SCHEDULE TAB */}
          {activeTab === 'schedule' && (
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-10 gap-6">
                <div>
                  <h2 className="text-4xl font-bold mb-2 text-slate-900 dark:text-white tracking-tight">Расписание</h2>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700">
                      Группа {user?.student_code?.slice(0, 8) || groupInfo.group}
                    </span>
                    <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                    <span className="text-sm">{user?.faculty || groupInfo.faculty}</span>
                  </div>
                </div>

                {/* Week Toggle */}
                <div className="relative bg-white dark:bg-slate-800 p-1.5 rounded-2xl flex shadow-inner border border-gray-200 dark:border-slate-700">
                  <div 
                    className={`absolute top-1.5 bottom-1.5 rounded-xl bg-emerald-500 shadow-lg shadow-emerald-500/30 transition-all duration-300 ease-out`}
                    style={{
                      left: weekType === 'upper' ? '6px' : '50%',
                      width: 'calc(50% - 6px)'
                    }}
                  ></div>
                  
                  <button
                    onClick={() => setWeekType('upper')}
                    className={`relative z-10 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors duration-300 w-36 ${
                      weekType === 'upper' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    1 Неделя
                  </button>
                  <button
                    onClick={() => setWeekType('lower')}
                    className={`relative z-10 px-6 py-2.5 rounded-xl text-sm font-bold transition-colors duration-300 w-36 ${
                      weekType === 'lower' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    2 Неделя
                  </button>
                </div>
              </div>

              {/* Days Navigation */}
              <div className="flex overflow-x-auto pb-6 gap-3 mb-2">
                {daysOfWeek.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`min-w-[4rem] h-16 rounded-2xl flex flex-col items-center justify-center border-2 transition-all duration-300 ${
                      selectedDay === day
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105'
                        : 'bg-white dark:bg-slate-800 border-transparent hover:border-emerald-200 dark:hover:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <span className={`text-sm font-medium ${selectedDay === day ? 'opacity-80' : 'opacity-60'}`}>{day}</span>
                  </button>
                ))}
              </div>

              {/* Schedule List */}
              <div className="space-y-4">
                {currentSchedule.length > 0 ? (
                  currentSchedule.map((item) => (
                    <ScheduleItem key={item.id} item={item} />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="text-6xl mb-6">☀️</div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Свободный день</h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                      Пар нет. Отличное время для саморазвития или отдыха.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LITERATURE TAB */}
          {activeTab === 'literature' && (
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-4xl font-bold mb-4 text-slate-900 dark:text-white tracking-tight">Литература</h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                  Учебные материалы, пособия и методические указания для студентов БНТУ
                </p>
              </div>

              {/* Search and Filter */}
              <div className="flex flex-col md:flex-row gap-4 mb-8">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Поиск по названию, автору или описанию..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                {/* Category Filter */}
                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="pl-12 pr-10 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none cursor-pointer min-w-[200px]"
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Results count */}
              <div className="mb-6 text-sm text-slate-600 dark:text-slate-400">
                Найдено материалов: {filteredLiterature.length}
              </div>

              {/* Literature Grid */}
              {filteredLiterature.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredLiterature.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <span className="inline-block px-2 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded-lg mb-1">
                              {categories.find(cat => cat.id === item.category)?.name}
                            </span>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {item.type === 'textbook' ? 'Учебник' : 'Пособие'} • {item.year}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2 line-clamp-2">
                        {item.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                        {item.author}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-500 mb-4 line-clamp-3">
                        {item.description}
                      </p>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Скачать
                        </button>
                        <button
                          className="flex items-center justify-center px-4 py-2 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-medium transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <BookOpen className="w-10 h-10 text-gray-400 dark:text-slate-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                    Материалы не найдены
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                    Попробуйте изменить параметры поиска или выбрать другую категорию
                  </p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
                  >
                    Сбросить фильтры
                  </button>
                </div>
              )}
            </div>
          )}

          {/* NEWS TAB */}
          {activeTab === 'news' && (
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-4xl font-bold mb-4 text-slate-900 dark:text-white tracking-tight">Новости</h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                  Актуальные события, достижения и важные объявления БНТУ
                </p>
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {newsCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedNewsCategory(category.id)}
                    className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                      selectedNewsCategory === category.id
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:text-emerald-600 dark:hover:text-emerald-400'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Featured News */}
              {filteredNews.filter(item => item.featured).length > 0 && (
                <div className="mb-12">
                  <h3 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Важные новости</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredNews.filter(item => item.featured).map((item) => (
                      <div
                        key={item.id}
                        className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/30 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <span className="inline-block px-3 py-1 bg-emerald-500 text-white text-xs font-medium rounded-lg">
                            {newsCategories.find(cat => cat.id === item.category)?.name}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.readTime}
                          </span>
                        </div>
                        <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-3 line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">
                          {item.excerpt}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Calendar className="w-4 h-4" />
                            {formatDate(item.date)}
                          </div>
                          <button className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium text-sm transition-colors">
                            Читать далее
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Regular News Grid */}
              <div>
                <h3 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">
                  {selectedNewsCategory === 'all' ? 'Все новости' : newsCategories.find(cat => cat.id === selectedNewsCategory)?.name}
                </h3>
                {filteredNews.filter(item => !item.featured).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredNews.filter(item => !item.featured).map((item) => (
                      <div
                        key={item.id}
                        className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg">
                            {newsCategories.find(cat => cat.id === item.category)?.name}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.readTime}
                          </span>
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-3 line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">
                          {item.excerpt}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <Calendar className="w-4 h-4" />
                            {formatDate(item.date)}
                          </div>
                          <button className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors">
                            Подробнее
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                      <Calendar className="w-10 h-10 text-gray-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                      Новостей не найдено
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                      В выбранной категории пока нет новостей. Попробуйте выбрать другую категорию.
                    </p>
                    <button
                      onClick={() => setSelectedNewsCategory('all')}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
                    >
                      Показать все новости
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Login Modal */}
      <LoginModal 
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
