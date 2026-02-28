import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import ScheduleItem from './components/ScheduleItem.jsx';
import LoginModal from './components/LoginModal.jsx';
import FeatureCard from './components/FeatureCard.jsx';
import TeamCarousel from './components/TeamCarousel.jsx';
import { Star, LogIn, ChevronRight, BookOpen, Download, ExternalLink, Search, Filter, Calendar, Clock, User, Tag, ArrowRight, Gamepad2, Trophy, Zap, Target, Brain, Heart } from 'lucide-react';
import { daysOfWeek, quickDayButtons, groupInfo, features, teamMembers } from './utils/constants.js';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';

function AppContent() {
  const [darkMode, setDarkMode] = useState(() => {
    // Восстанавливаем тему из localStorage при загрузке
    const savedTheme = localStorage.getItem('darkMode');
    return savedTheme !== null ? JSON.parse(savedTheme) : true;
  });
  const [activeTab, setActiveTab] = useState('home'); 
  const [selectedDay, setSelectedDay] = useState('Пн');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedNewsCategory, setSelectedNewsCategory] = useState('all');
  const [selectedGameCategory, setSelectedGameCategory] = useState('all');
  const [weekType, setWeekType] = useState('upper');
  const [gameScores, setGameScores] = useState({});
  const { loading, isAuthenticated, user } = useAuth();

  // Games data
  const gamesData = [
    {
      id: 1,
      title: "Cyber Racing 2077",
      developer: "Neon Studios",
      category: "racing",
      price: 59.99,
      originalPrice: 79.99,
      discount: 25,
      rating: 4.5,
      image: "https://picsum.photos/seed/cyber-racing/400/225",
      description: "Гонки в киберпанк-мире будущего",
      tags: ["Гонки", "Киберпанк", "Будущее"],
      featured: true
    },
    {
      id: 2,
      title: "Fantasy Quest IX",
      developer: "Magic Games",
      category: "rpg",
      price: 49.99,
      originalPrice: null,
      discount: 0,
      rating: 4.8,
      image: "https://picsum.photos/seed/fantasy-quest/400/225",
      description: "Эпическое RPG приключение",
      tags: ["RPG", "Фэнтези", "Приключения"],
      featured: true
    },
    {
      id: 3,
      title: "Space Warriors",
      developer: "Galaxy Interactive",
      category: "shooter",
      price: 39.99,
      originalPrice: 59.99,
      discount: 33,
      rating: 4.2,
      image: "https://picsum.photos/seed/space-warriors/400/225",
      description: "Космические сражения",
      tags: ["Шутер", "Космос", "Экшен"],
      featured: false
    },
    {
      id: 4,
      title: "Puzzle Master Pro",
      developer: "Brain Games",
      category: "puzzle",
      price: 19.99,
      originalPrice: null,
      discount: 0,
      rating: 4.6,
      image: "https://picsum.photos/seed/puzzle-master/400/225",
      description: "Сложные головоломки",
      tags: ["Головоломки", "Логика", "Интеллект"],
      featured: false
    },
    {
      id: 5,
      title: "Battle Arena Legends",
      developer: "Combat Studios",
      category: "action",
      price: 0,
      originalPrice: null,
      discount: 0,
      rating: 4.3,
      image: "https://picsum.photos/seed/battle-arena/400/225",
      description: "Многопользовательские бои",
      tags: ["MOBA", "Мультиплеер", "Бесплатно"],
      featured: true
    },
    {
      id: 6,
      title: "Survival Island",
      developer: "Wild Games",
      category: "survival",
      price: 29.99,
      originalPrice: 39.99,
      discount: 25,
      rating: 4.4,
      image: "https://picsum.photos/seed/survival-island/400/225",
      description: "Выживание на необитаемом острове",
      tags: ["Выживание", "Открытый мир", "Приключения"],
      featured: false
    },
    {
      id: 7,
      title: "Racing Championship",
      developer: "Speed Games",
      category: "racing",
      price: 44.99,
      originalPrice: null,
      discount: 0,
      rating: 4.1,
      image: "https://picsum.photos/seed/racing-champ/400/225",
      description: "Реалистичные гоночные соревнования",
      tags: ["Гонки", "Симулятор", "Спорт"],
      featured: false
    },
    {
      id: 8,
      title: "Mystery Detective",
      developer: "Dark Studios",
      category: "adventure",
      price: 24.99,
      originalPrice: 34.99,
      discount: 29,
      rating: 4.7,
      image: "https://picsum.photos/seed/mystery-detective/400/225",
      description: "Расследование загадочных преступлений",
      tags: ["Детектив", "Приключения", "Мистика"],
      featured: false
    }
  ];

  const gameCategories = [
    { id: 'all', name: 'Все игры' },
    { id: 'action', name: 'Экшен' },
    { id: 'rpg', name: 'RPG' },
    { id: 'racing', name: 'Гонки' },
    { id: 'shooter', name: 'Шутеры' },
    { id: 'puzzle', name: 'Головоломки' },
    { id: 'survival', name: 'Выживание' },
    { id: 'adventure', name: 'Приключения' }
  ];

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

  const [userSchedule, setUserSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Загрузка расписания пользователя
  useEffect(() => {
    if (isAuthenticated && user?.student_code) {
      loadUserSchedule();
    }
  }, [isAuthenticated, user?.student_code]);

  const loadUserSchedule = async () => {
    if (!user?.student_code) return;
    
    setScheduleLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/schedule', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserSchedule(data.schedule);
        }
      } else {
        console.error('Failed to load schedule');
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setScheduleLoading(false);
    }
  };

  // Преобразование расписания из API в формат для отображения
  const getScheduleForDay = (day) => {
    if (!userSchedule || !userSchedule.Schedule) return [];
    
    const dayMapping = {
      'Пн': 'Понедельник',
      'Вт': 'Вторник', 
      'Ср': 'Среда',
      'Чт': 'Четверг',
      'Пт': 'Пятница',
      'Сб': 'Суббота',
      'Вс': 'Воскресенье'
    };
    
    const fullDayName = dayMapping[day];
    
    // Выбираем неделю (0 - первая неделя, 1 - вторая неделя)
    const weekIndex = weekType === 'upper' ? 0 : 1;
    
    // Проверяем, что неделя существует
    if (!userSchedule.Schedule[weekIndex]) return [];
    
    const daySchedule = userSchedule.Schedule[weekIndex];
    
    if (!daySchedule || !daySchedule[fullDayName]) return [];
    
    return daySchedule[fullDayName].map((item, index) => ({
      id: index + 1,
      time: item.Time,
      subject: item.Matter,
      teacher: item.Teacher,
      frame: item.Frame,
      classroom: item.Classroom,
      type: getLessonType(item.Matter)
    }));
  };

  // Определение типа занятия по названию
  const getLessonType = (subject) => {
    if (subject.includes('(Лекц.)') || subject.includes('Лекция')) return 'Лекция';
    if (subject.includes('(Лаб.)') || subject.includes('Лабораторная')) return 'Лабораторная';
    if (subject.includes('(Практ.)') || subject.includes('Практика')) return 'Практика';
    return 'Лекция';
  };

  // Получение времени в московской часовой зоне (UTC+3)
  const getMoscowTime = () => {
    const now = new Date();
    // Получаем UTC время и добавляем 3 часа для МСК
    const moscowTime = new Date(now.getTime() + (3 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return moscowTime;
  };

  // Определение сегодняшнего и завтрашнего дня
  const getTodayDay = () => {
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const moscowTime = getMoscowTime();
    const today = moscowTime.getDay();
    // Преобразуем день недели: 0(Вс) -> 6(Сб), 1(Пн) -> 0(Пн), и т.д.
    const adjustedDay = today === 0 ? 6 : today - 1;
    return days[adjustedDay] || 'Пн'; // fallback на Пн
  };

  const getTomorrowDay = () => {
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const moscowTime = getMoscowTime();
    const today = moscowTime.getDay();
    const tomorrow = (today + 1) % 7;
    // Для завтрашнего дня: 0(Вс) -> undefined (выходной), 1(Пн) -> 0(Пн), 2(Вт) -> 1(Вт), и т.д.
    if (tomorrow === 0) return undefined; // Воскресенье - нет занятий
    const adjustedTomorrow = tomorrow - 1;
    return days[adjustedTomorrow] || 'Вт'; // fallback на Вт
  };

  // Определение недели (верхняя/нижняя) начиная с 1 сентября 2025
  const getWeekType = () => {
    const moscowTime = getMoscowTime();
    const startDate = new Date('2025-09-01T00:00:00'); // 1 сентября 2025
    const diffTime = moscowTime.getTime() - startDate.getTime();
    const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
    
    // Нечетные недели - верхние, четные - нижние
    return diffWeeks % 2 === 0 ? 'upper' : 'lower';
  };

  // Обработчики быстрых кнопок
  const handleQuickDaySelect = (dayType) => {
    if (dayType === 'today') {
      setSelectedDay(getTodayDay());
      setWeekType(getWeekType()); // Автоматически определяем неделю
    } else if (dayType === 'tomorrow') {
      setSelectedDay(getTomorrowDay());
      setWeekType(getWeekType()); // Автоматически определяем неделю
    }
  };

  const currentSchedule = getScheduleForDay(selectedDay);

  // Literature data
  const categories = [
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

  // Literature pagination state and loader
  const [literatureItems, setLiteratureItems] = useState([]);
  const [literatureTotal, setLiteratureTotal] = useState(0);
  const [literaturePage, setLiteraturePage] = useState(1);
  const literaturePageSize = 6;
  const literatureMaxPage = Math.max(1, Math.ceil(literatureTotal / literaturePageSize));
  const [literatureLoading, setLiteratureLoading] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(['all']);
  const [sortBy, setSortBy] = useState('default');
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);

  const fetchLiterature = async (page = 1) => {
    setLiteratureLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('page_size', literaturePageSize);
      if (searchQuery) params.set('search', searchQuery);
      if (selectedCategories.length > 0 && !selectedCategories.includes('all')) {
        selectedCategories.forEach(cat => params.append('category', cat));
      }
      if (sortBy !== 'default') {
        params.set('sort', sortBy);
      }

      const res = await fetch(`/api/literature?${params.toString()}`);
      if (!res.ok) throw new Error('Ошибка запроса литературы');
      const data = await res.json();
      setLiteratureItems(data.items || []);
      setLiteratureTotal(data.total || 0);
      setLiteraturePage(data.page || page);
    } catch (e) {
      console.error('fetchLiterature error', e);
      setLiteratureItems([]);
      setLiteratureTotal(0);
    } finally {
      setLiteratureLoading(false);
    }
  };

  // When page changes or when the literature tab becomes active, load data
  useEffect(() => {
    if (activeTab === 'literature') {
      fetchLiterature(literaturePage);
    }
  }, [activeTab, literaturePage, selectedCategories, sortBy]);

  // When search or category changes, reset to page 1 and fetch
  useEffect(() => {
    if (activeTab === 'literature') {
      setLiteraturePage(1);
      fetchLiterature(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategory]);

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

  // Filter games based on category
  const filteredGames = gamesData.filter(item => {
    return selectedGameCategory === 'all' || item.category === selectedGameCategory;
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
              <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-10 gap-6 w-full">
                <div className="text-left self-start">
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
                    className={`absolute top-1.5 bottom-1.5 rounded-xl bg-white dark:bg-slate-700 transition-all duration-300 ease-out shadow-sm`}
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

              {/* Quick Day Buttons */}
              <div className="flex gap-3 mb-4">
                {/* Debug: {JSON.stringify(quickDayButtons)} */}
                {quickDayButtons.map((button) => (
                  <button
                    key={button.id}
                    onClick={() => handleQuickDaySelect(button.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                      (button.id === 'today' && selectedDay === getTodayDay() && weekType === getWeekType()) ||
                      (button.id === 'tomorrow' && selectedDay === getTomorrowDay() && weekType === getWeekType())
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:text-emerald-600 dark:hover:text-emerald-400'
                    }`}
                  >
                    {button.name}
                  </button>
                ))}
              </div>

              {/* Days Navigation */}
              <div className="flex overflow-x-auto px-3 py-2 pb-6 gap-3 mb-2">
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
                {scheduleLoading ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Загрузка расписания...</h3>
                  </div>
                ) : currentSchedule.length > 0 ? (
                  currentSchedule.map((item) => (
                    <ScheduleItem key={item.id} item={item} />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="text-6xl mb-6">☀️</div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                      {userSchedule ? 'Свободный день' : 'Расписание не загружено'}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                      {userSchedule 
                        ? 'Пар нет. Отличное время для саморазвития или отдыха.'
                        : 'Попробуйте обновить страницу или войти заново.'
                      }
                    </p>
                    {!userSchedule && (
                      <button 
                        onClick={loadUserSchedule}
                        className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
                      >
                        Обновить расписание
                      </button>
                    )}
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
              <div className="flex flex-row gap-2 mb-8">
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
                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="flex items-center justify-center w-12 h-12 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex-shrink-0"
                  title="Фильтр категорий"
                >
                  <Filter className="w-5 h-5" />
                </button>

                {/* Sort Button */}
                <button
                  onClick={() => setIsSortModalOpen(true)}
                  className="flex items-center justify-center w-12 h-12 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors flex-shrink-0"
                  title="Сортировка"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </button>
              </div>

              {/* Active Filters */}
              <div className="mb-6">
                {/* Results count */}
                <div className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                  Найдено материалов: <span className="font-medium text-slate-900 dark:text-white">{literatureTotal}</span>
                </div>
                
                {/* Active filters display */}
                <div className="flex flex-wrap gap-2 items-center">
                  {/* Search filter */}
                  {searchQuery && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium">
                      <Search className="w-4 h-4" />
                      <span>{searchQuery}</span>
                      <button
                        onClick={() => setSearchQuery('')}
                        className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  
                  {/* Categories filter */}
                  {selectedCategories.length > 0 && !selectedCategories.includes('all') && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                      <Filter className="w-4 h-4" />
                      <span>{selectedCategories.length} {selectedCategories.length === 1 ? 'категория' : selectedCategories.length < 5 ? 'категории' : 'категорий'}</span>
                      <button
                        onClick={() => {
                          setSelectedCategories(['all']);
                          setLiteraturePage(1);
                        }}
                        className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  
                  {/* Sort filter */}
                  {sortBy !== 'default' && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                      <span>
                        {(() => {
                          const option = [
                            { id: 'title_asc', name: 'А-Я' },
                            { id: 'title_desc', name: 'Я-А' },
                            { id: 'year_desc', name: 'новые' },
                            { id: 'year_asc', name: 'старые' },
                            { id: 'category_asc', name: 'категория А-Я' },
                            { id: 'category_desc', name: 'категория Я-А' },
                            { id: 'size_desc', name: 'большие' },
                            { id: 'size_asc', name: 'маленькие' }
                          ].find(opt => opt.id === sortBy);
                          return option ? option.name : sortBy;
                        })()}
                      </span>
                      <button
                        onClick={() => {
                          setSortBy('default');
                          setLiteraturePage(1);
                        }}
                        className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center hover:bg-purple-700 transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  
                  {/* Clear all filters */}
                  {(searchQuery || (selectedCategories.length > 0 && !selectedCategories.includes('all')) || sortBy !== 'default') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategories(['all']);
                        setSortBy('default');
                        setLiteraturePage(1);
                      }}
                      className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Сбросить все
                    </button>
                  )}
                </div>
              </div>

              {/* Literature Grid */}
              {literatureItems.length > 0 ? (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {literatureItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between h-full"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/20 rounded-md flex items-center justify-center overflow-hidden">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                              <BookOpen className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            )}
                          </div>
                          <div>
                            <span className="inline-block px-2 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded-lg mb-1">
                              {item.category || 'Без категории'}
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
                        { (item.downloadUrl || item.download_url) ? (
                          <a
                            href={item.downloadUrl || item.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="flex-1 flex items-center justify-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors"
                          >
                            <Download className="w-4 h-4" />
                              Скачать
                              { (item.downloadSize || item.size) && (
                                <span className="text-sm text-slate-200 dark:text-slate-300 ml-1">({item.downloadSize || item.size})</span>
                              ) }
                          </a>
                        ) : (
                          <button
                            disabled
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-500 rounded-xl text-sm font-medium"
                          >
                            <Download className="w-4 h-4" />
                            Скачать
                          </button>
                        )}

                        { (item.downloadUrl || item.download_url) ? (
                          <a
                            href={item.downloadUrl || item.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center px-4 py-2 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-medium transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <button
                            disabled
                            className="flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-500 rounded-xl text-sm font-medium"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  </div>

                  {/* Pagination controls */}
                  <div className="flex items-center justify-center mt-10">
                    <div className="flex items-center gap-2 bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/50 dark:border-slate-700/50 rounded-2xl p-2 shadow-lg">
                      {/* First button */}
                      <button
                        onClick={() => setLiteraturePage(1)}
                        disabled={literaturePage === 1}
                        title="В начало"
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                          literaturePage === 1 
                            ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' 
                            : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* Previous button */}
                      <button
                        onClick={() => literaturePage > 1 && setLiteraturePage(literaturePage - 1)}
                        disabled={literaturePage === 1}
                        title="Предыдущая"
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                          literaturePage === 1 
                            ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' 
                            : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>

                      {/* Page input */}
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="1"
                          max={literatureMaxPage}
                          value={literaturePage}
                          onChange={(e) => {
                            const page = parseInt(e.target.value);
                            if (page >= 1 && page <= literatureMaxPage) {
                              setLiteraturePage(page);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const page = parseInt(e.target.value);
                              if (page >= 1 && page <= literatureMaxPage) {
                                setLiteraturePage(page);
                              }
                            }
                          }}
                          className="w-12 px-1.5 py-2 bg-emerald-500 dark:bg-emerald-600 text-white rounded-xl text-sm font-medium shadow-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-400 [-moz-appearance:_textfield] [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <div className="text-slate-400 dark:text-slate-500 text-sm font-medium px-1">
                          из
                        </div>
                        <div className="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-medium">
                          {literatureMaxPage}
                        </div>
                      </div>

                      {/* Next button */}
                      <button
                        onClick={() => {
                          if (literaturePage < literatureMaxPage) setLiteraturePage(literaturePage + 1);
                        }}
                        disabled={literaturePage >= literatureMaxPage}
                        title="Следующая"
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                          literaturePage >= literatureMaxPage 
                            ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' 
                            : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>

                      {/* Last button */}
                      <button
                        onClick={() => setLiteraturePage(literatureMaxPage)}
                        disabled={literaturePage === literatureMaxPage}
                        title="В конец"
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                          literaturePage === literatureMaxPage 
                            ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed' 
                            : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ) : literatureLoading ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin mb-6"></div>
                  <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Загрузка материалов...
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    Пожалуйста, подождите немного
                  </p>
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

          {/* Category Modal */}
          {isCategoryModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-gray-200 dark:border-slate-700 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-slate-700/50">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <Filter className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    Выбор категории
                  </h2>
                  <button
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/10 dark:hover:bg-slate-700/10 transition-all duration-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Search inside modal */}
                <div className="px-6 pt-3 pb-3">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 opacity-60" />
                    <input
                      type="text"
                      placeholder="Быстрый поиск категории..."
                      value={categorySearchQuery}
                      onChange={(e) => setCategorySearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Categories Grid */}
                <div className="px-6 pt-1 pb-6 overflow-y-auto max-h-[50vh]">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {categories
                      .filter(cat => cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase()))
                      .map((category) => (
                        <button
                          key={category.id}
                          onClick={() => {
                            if (category.id === 'all') {
                              setSelectedCategories(['all']);
                            } else {
                              const newSelected = selectedCategories.includes('all') 
                                ? [category.id]
                                : selectedCategories.includes(category.id)
                                  ? selectedCategories.filter(id => id !== category.id)
                                  : [...selectedCategories, category.id];
                              setSelectedCategories(newSelected.length > 0 ? newSelected : ['all']);
                            }
                          }}
                          className={`p-4 rounded-2xl border-2 transition-all duration-200 text-left hover:scale-105 relative ${
                            selectedCategories.includes(category.id)
                              ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                              : 'border-white/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/40 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {selectedCategories.includes(category.id) && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-white text-emerald-500 rounded-full flex items-center justify-center">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                          <div className="w-full">
                            <div className="font-medium text-slate-900 dark:text-white break-words text-center">{category.name}</div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-white/20 dark:border-slate-700/50">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Выбрано: <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {selectedCategories.includes('all') 
                        ? 'Все категории' 
                        : `${selectedCategories.length} ${selectedCategories.length === 1 ? 'категория' : selectedCategories.length < 5 ? 'категории' : 'категорий'}`
                      }
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setSelectedCategories(['all']);
                        setCategorySearchQuery('');
                      }}
                      className="px-6 py-3 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl font-medium transition-all duration-300"
                    >
                      Сбросить
                    </button>
                    <button
                      onClick={() => {
                        setIsCategoryModalOpen(false);
                        setLiteraturePage(1);
                        fetchLiterature(1);
                      }}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-medium transition-all duration-300 hover:scale-105"
                    >
                      Применить
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sort Modal */}
          {isSortModalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-gray-200 dark:border-slate-700 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/20 dark:border-slate-700/50">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                    <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                    Сортировка
                  </h2>
                  <button
                    onClick={() => setIsSortModalOpen(false)}
                    className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white/10 dark:hover:bg-slate-700/10 transition-all duration-300"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Sort Options */}
                <div className="p-6">
                  <div className="space-y-3">
                    {[
                      { id: 'default', name: 'По умолчанию', icon: '📋' },
                      { id: 'title_asc', name: 'По алфавиту (А-Я)', icon: '🔤' },
                      { id: 'title_desc', name: 'По алфавиту (Я-А)', icon: '🔤' },
                      { id: 'year_desc', name: 'По году (новые)', icon: '📅' },
                      { id: 'year_asc', name: 'По году (старые)', icon: '📅' },
                      { id: 'category_asc', name: 'По категории (А-Я)', icon: '📁' },
                      { id: 'category_desc', name: 'По категории (Я-А)', icon: '📁' },
                      { id: 'size_desc', name: 'По размеру (большие)', icon: '📦' },
                      { id: 'size_asc', name: 'По размеру (маленькие)', icon: '📦' }
                    ].map((option) => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setSortBy(option.id);
                          setIsSortModalOpen(false);
                          setLiteraturePage(1);
                        }}
                        className={`w-full p-4 rounded-2xl border-2 transition-all duration-200 text-left hover:scale-105 flex items-center gap-3 ${
                          sortBy === option.id
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                            : 'border-gray-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="text-xl">{option.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium">{option.name}</div>
                        </div>
                        {sortBy === option.id && (
                          <div className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-white/20 dark:border-slate-700/50">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Текущая: <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {(() => {
                        const option = [
                          { id: 'default', name: 'По умолчанию' },
                          { id: 'title_asc', name: 'По алфавиту (А-Я)' },
                          { id: 'title_desc', name: 'По алфавиту (Я-А)' },
                          { id: 'year_desc', name: 'По году (новые)' },
                          { id: 'year_asc', name: 'По году (старые)' },
                          { id: 'category_asc', name: 'По категории (А-Я)' },
                          { id: 'category_desc', name: 'По категории (Я-А)' },
                          { id: 'size_desc', name: 'По размеру (большие)' },
                          { id: 'size_asc', name: 'По размеру (маленькие)' }
                        ].find(opt => opt.id === sortBy);
                        return option ? option.name : 'По умолчанию';
                      })()}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsSortModalOpen(false)}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-medium transition-all duration-300 hover:scale-105"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
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

          {/* GAMES TAB */}
          {activeTab === 'games' && (
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-10">
                <h2 className="text-4xl font-bold mb-4 text-slate-900 dark:text-white tracking-tight">Игры</h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                  Лучшие игры для студентов БНТУ - отдыхайте с пользой
                </p>
              </div>

              {/* Category Filter */}
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {gameCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedGameCategory(category.id)}
                    className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                      selectedGameCategory === category.id
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:text-emerald-600 dark:hover:text-emerald-400'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Featured Games */}
              {filteredGames.filter(item => item.featured).length > 0 && (
                <div className="mb-12">
                  <h3 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Рекомендуемые игры</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGames.filter(item => item.featured).map((game) => (
                      <div
                        key={game.id}
                        className="group relative bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                      >
                        {/* Game Image */}
                        <div className="relative h-48 overflow-hidden">
                          <img 
                            src={game.image} 
                            alt={game.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          {game.discount > 0 && (
                            <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-bold">
                              -{game.discount}%
                            </div>
                          )}
                          {game.price === 0 && (
                            <div className="absolute top-3 left-3 bg-emerald-500 text-white px-3 py-1 rounded-lg text-sm font-bold">
                              Бесплатно
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>

                        {/* Game Info */}
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-1 line-clamp-1">
                                {game.title}
                              </h3>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {game.developer}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 ml-3">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {game.rating}
                              </span>
                            </div>
                          </div>

                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                            {game.description}
                          </p>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            {game.tags.slice(0, 3).map((tag, index) => (
                              <span 
                                key={index}
                                className="px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs rounded-lg"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* Price and Action */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {game.price === 0 ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                                  Бесплатно
                                </span>
                              ) : (
                                <>
                                  {game.originalPrice && (
                                    <span className="text-sm text-slate-500 dark:text-slate-400 line-through">
                                      ${game.originalPrice}
                                    </span>
                                  )}
                                  <span className="text-slate-900 dark:text-white font-bold text-lg">
                                    ${game.price}
                                  </span>
                                </>
                              )}
                            </div>
                            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
                              <Download className="w-4 h-4" />
                              {game.price === 0 ? 'Получить' : 'Купить'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All Games Grid */}
              <div>
                <h3 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">
                  {selectedGameCategory === 'all' ? 'Все игры' : gameCategories.find(cat => cat.id === selectedGameCategory)?.name}
                </h3>
                {filteredGames.filter(item => !item.featured).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {filteredGames.filter(item => !item.featured).map((game) => (
                      <div
                        key={game.id}
                        className="group bg-white dark:bg-slate-800 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                      >
                        {/* Game Image */}
                        <div className="relative h-32 overflow-hidden">
                          <img 
                            src={game.image} 
                            alt={game.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          {game.discount > 0 && (
                            <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                              -{game.discount}%
                            </div>
                          )}
                          {game.price === 0 && (
                            <div className="absolute top-2 left-2 bg-emerald-500 text-white px-2 py-1 rounded text-xs font-bold">
                              Бесплатно
                            </div>
                          )}
                        </div>

                        {/* Game Info */}
                        <div className="p-4">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1 line-clamp-1">
                            {game.title}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                            {game.developer}
                          </p>

                          {/* Rating */}
                          <div className="flex items-center gap-1 mb-3">
                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {game.rating}
                            </span>
                          </div>

                          {/* Price and Action */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              {game.price === 0 ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                  Бесплатно
                                </span>
                              ) : (
                                <>
                                  {game.originalPrice && (
                                    <span className="text-xs text-slate-500 dark:text-slate-400 line-through">
                                      ${game.originalPrice}
                                    </span>
                                  )}
                                  <span className="text-slate-900 dark:text-white font-bold text-sm">
                                    ${game.price}
                                  </span>
                                </>
                              )}
                            </div>
                            <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors">
                              {game.price === 0 ? 'Получить' : 'Купить'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                      <Gamepad2 className="w-10 h-10 text-gray-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                      Игры не найдены
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-6">
                      В выбранной категории пока нет игр. Попробуйте выбрать другую категорию.
                    </p>
                    <button
                      onClick={() => setSelectedGameCategory('all')}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
                    >
                      Показать все игры
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-slate-500 dark:text-slate-400">
            <p>© 2026 BentumWeb. Все права защищены.</p>
          </div>
        </div>
      </footer>

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
