import React, { useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Database,
  Eye,
  Globe,
  Lock,
  Mail,
  Shield,
  User,
} from 'lucide-react';

const LAST_UPDATED = new Date().toLocaleDateString('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const POLICY_SECTIONS = [
  {
    title: 'Введение',
    icon: Globe,
    content: [
      'Bentum уважает конфиденциальность пользователей и старается обрабатывать данные только в объёме, который действительно нужен для работы платформы.',
      'Используя сервис, вы соглашаетесь с этой политикой. Если условия вам не подходят, пожалуйста, не используйте платформу.',
    ],
  },
  {
    title: 'Какие данные мы собираем',
    icon: Database,
    blocks: [
      {
        title: 'Персональные данные',
        items: [
          'ФИО пользователя',
          'Студенческий код',
          'Факультет и учебная группа',
          'Telegram ID, если вы подключаете уведомления',
        ],
      },
      {
        title: 'Технические данные',
        items: [
          'IP-адрес и информация о сессии',
          'Данные о входе и активности',
          'История посещения страниц',
          'Служебные журналы безопасности',
        ],
      },
    ],
  },
  {
    title: 'Как используются данные',
    icon: Eye,
    blocks: [
      {
        title: 'Основные цели',
        items: [
          'Аутентификация и авторизация',
          'Предоставление образовательных функций платформы',
          'Персонализация интерфейса и контента',
          'Поддержка пользователей и обработка обращений',
        ],
      },
      {
        title: 'Технические цели',
        items: [
          'Обеспечение стабильной работы сервиса',
          'Защита аккаунтов и предотвращение злоупотреблений',
          'Анализ производительности и улучшение продукта',
          'Диагностика ошибок и расследование инцидентов',
        ],
      },
    ],
  },
  {
    title: 'Как мы защищаем данные',
    icon: Lock,
    content: [
      'Для защиты данных применяются шифрование при передаче, ограничение доступа, резервное копирование и базовые меры мониторинга безопасности.',
      'Мы также стараемся ограничивать круг лиц, которые могут получить доступ к пользовательским данным, и использовать только необходимые технические интеграции.',
    ],
  },
  {
    title: 'Cookies и служебные технологии',
    icon: Database,
    blocks: [
      {
        title: 'Что используется',
        items: [
          'Необходимые cookies для входа и сессии',
          'Функциональные cookies для пользовательских настроек',
          'Служебные данные для стабильной работы интерфейса',
        ],
      },
      {
        title: 'Зачем это нужно',
        items: [
          'Чтобы пользователь оставался авторизованным',
          'Чтобы сохранялись выбранные параметры интерфейса',
          'Чтобы сервис работал предсказуемо и безопасно',
        ],
      },
    ],
  },
  {
    title: 'Ваши права',
    icon: User,
    blocks: [
      {
        title: 'Вы можете',
        items: [
          'Запросить исправление неточных данных',
          'Обратиться с просьбой об удалении аккаунта или информации',
          'Уточнить, какие данные используются и зачем',
        ],
      },
    ],
  },
  {
    title: 'Передача данных третьим лицам',
    icon: Globe,
    content: [
      'Мы не продаём персональные данные пользователей. Передача может происходить только с вашего согласия, по требованию закона или техническим подрядчикам, которые помогают поддерживать работу сервиса.',
    ],
  },
  {
    title: 'Сроки хранения',
    icon: Calendar,
    blocks: [
      {
        title: 'Базовые сроки',
        items: [
          'Учётная запись — до удаления аккаунта',
          'Логи активности — ограниченный период для безопасности и диагностики',
          'Cookies — до окончания сессии или в пределах технического срока жизни',
          'Резервные копии — в течение ограниченного периода хранения',
        ],
      },
    ],
  },
  {
    title: 'Связь с нами',
    icon: Mail,
    content: [
      'Если у вас есть вопросы по этой политике или по использованию ваших данных, свяжитесь с нами через встроенную поддержку или Telegram: @Amfisak.',
    ],
  },
  {
    title: 'Изменения политики',
    icon: Shield,
    content: [
      'Мы можем обновлять эту политику по мере развития проекта. Актуальная версия всегда публикуется на этой странице вместе с датой последнего обновления.',
    ],
  },
];

function Section({ section }) {
  const Icon = section.icon;

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-800 sm:rounded-2xl sm:p-6 lg:p-8">
      <h2 className="mb-3 flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white sm:mb-4 sm:gap-3 sm:text-2xl">
        <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 sm:h-6 sm:w-6" />
        <span className="text-lg sm:text-xl">{section.title}</span>
      </h2>

      {section.content ? (
        <div className="space-y-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300 sm:space-y-4 sm:text-base">
          {section.content.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      ) : null}

      {section.blocks ? (
        <div className="space-y-4 sm:space-y-6">
          {section.blocks.map((block) => (
            <div key={block.title} className="rounded-lg bg-gray-50 p-3 dark:bg-slate-700/50 sm:p-4">
              <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white sm:text-base">
                {block.title}
              </h3>
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300 sm:text-base">
                {block.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-0.5 text-emerald-600 dark:text-emerald-400">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PrivacyPolicy({ setActiveTab }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-4xl px-4 py-6 sm:py-8">
        <button
          onClick={() => setActiveTab?.('home')}
          className="mb-4 inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-gray-50 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 sm:mb-6 sm:rounded-2xl sm:px-4 sm:text-base"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Назад</span>
        </button>

        <div className="mb-8 text-center sm:mb-12">
          <div className="mb-3 flex justify-center sm:mb-4">
            <div className="rounded-xl bg-emerald-100 p-2 dark:bg-emerald-900/20 sm:rounded-2xl sm:p-3">
              <Shield className="h-6 w-6 text-emerald-600 dark:text-emerald-400 sm:h-8 sm:w-8" />
            </div>
          </div>
          <h1 className="mb-3 px-2 text-2xl font-bold text-slate-900 dark:text-white sm:mb-4 sm:text-3xl lg:text-4xl">
            Политика конфиденциальности
          </h1>
          <p className="mx-auto max-w-2xl px-4 text-sm text-slate-600 dark:text-slate-300 sm:text-base lg:text-lg">
            Последнее обновление: {LAST_UPDATED}
          </p>
        </div>

        <div className="space-y-6 sm:space-y-8">
          {POLICY_SECTIONS.map((section) => (
            <Section key={section.title} section={section} />
          ))}
        </div>

        <div className="mt-8 px-4 text-center text-slate-600 dark:text-slate-400 sm:mt-12">
          <p className="text-xs sm:text-sm">
            Эта политика действует с {LAST_UPDATED} и применяется ко всем пользователям платформы Bentum.
          </p>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicy;
