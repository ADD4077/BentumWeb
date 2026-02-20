// Константы приложения
export const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

// Типы занятий
export const lessonTypes = {
  'Лекция': 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30',
  'Лабораторная': 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300 border border-red-100 dark:border-red-900/30',
  'Практика': 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-300 border border-yellow-100 dark:border-yellow-900/30',
  'Семинар': 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-300 border border-green-100 dark:border-green-900/30'
};

// Группа и факультет
export const groupInfo = {
  group: '10701120',
  faculty: 'ФИТР'
};

// Наша команда
export const teamMembers = [
  {
    name: 'Гончарик Александр',
    role: 'Промоутер / Frontend-разработчик',
    description: 'React эксперт, создал интерфейс БНТУ Бота. Любит создавать красивые и функциональные компоненты.',
    image: null
  },
  {
    name: 'Абраменко Александр',
    role: '2D / 3D Дизайнер',
    description: 'Дизайнер с душой. Создала современный интерфейс и продумала пользовательский опыт.',
    image: null
  },
  {
    name: 'Смоленский Андрей',
    role: 'Разработчик / Системный администратор',
    description: 'Node.js специалист. Разработал API и обеспечил быструю работу серверной части.',
    image: null
  },
  {
    name: 'Свиридович Павел',
    role: 'Тимлид / Разработчик',
    description: 'Организовала процесс разработки и координировала работу команды. Следит за качеством.',
    image: null
  },
  {
    name: 'Альшевский Алексей',
    role: 'Тестировщик',
    description: 'Тестировщик с вниманием к деталям. Обеспечивает качество продукта и находит все баги.',
    image: null
  }
];
export const features = [
  {
    title: 'Молниеносная скорость',
    description: 'Мы кешируем расписание на вашем устройстве. Даже если интернет пропадет в подвале 11 корпуса — вы будете знать, где пара.'
  },
  {
    title: 'Адаптивность',
    description: 'Идеально работает на iOS и Android. Добавьте на домашний экран как приложение и получайте мгновенный доступ к расписанию.'
  },
  {
    title: 'Приватность',
    description: 'Не требует пароля от личного кабинета БНТУ. Все данные хранятся локально на вашем устройстве под защитой.'
  },
  {
    title: 'Умные уведомления',
    description: 'Бот сам определит, какая сейчас неделя (1 или 2) и напомнит о начале пары за 15 минут. Никогда не опоздайте!'
  }
];
