import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Clock3,
  Coffee,
  GraduationCap,
  Loader2,
  MapPinned,
  Route,
} from 'lucide-react';

import ScheduleItem from '../components/ScheduleItem.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSchedule } from '../hooks/useSchedule.js';
import { api } from '../services/api.js';
import { daysOfWeek, quickDayButtons } from '../utils/constants.js';

const QUICK_BUTTON_META = {
  today: {
    label: 'Сегодня',
    icon: CalendarDays,
  },
  tomorrow: {
    label: 'Завтра',
    icon: Clock3,
  },
};

const DAY_NAME_MAP = Object.freeze({
  [daysOfWeek[0]]: 'Понедельник',
  [daysOfWeek[1]]: 'Вторник',
  [daysOfWeek[2]]: 'Среда',
  [daysOfWeek[3]]: 'Четверг',
  [daysOfWeek[4]]: 'Пятница',
  [daysOfWeek[5]]: 'Суббота',
});

const SHOW_ROUTE_CARD = false;

function getCurrentTimeMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function parseLessonTimeRange(timeRange) {
  const [start = '', end = ''] = String(timeRange || '').split(' - ');
  const [startHour = 0, startMinute = 0] = start.split(':').map(Number);
  const hasExplicitEnd = Boolean(end && end.includes(':'));

  let endHour = 0;
  let endMinute = 0;

  if (hasExplicitEnd) {
    [endHour, endMinute] = end.split(':').map(Number);
  } else {
    const totalEndMinutes = startHour * 60 + startMinute + 95;
    endHour = Math.floor(totalEndMinutes / 60);
    endMinute = totalEndMinutes % 60;
  }

  return {
    start,
    end: hasExplicitEnd ? end : `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`,
    startMinutes: startHour * 60 + startMinute,
    endMinutes: endHour * 60 + endMinute,
  };
}

function cleanLessonSubject(subject) {
  return String(subject || '')
    .replace(/^\(Лаб\.\)\s*/, '')
    .replace(/^\(Лекц\.\)\s*/, '')
    .replace(/^\(Практ\.\)\s*/, '')
    .replace(/^\(Сем\.\)\s*/, '')
    .trim();
}

function inferLessonType(subject) {
  const value = String(subject || '');

  if (value.includes('(Лаб.)') || value.includes('Лабораторная')) return 'Лабораторная';
  if (value.includes('(Лекц.)') || value.includes('Лекция')) return 'Лекция';
  if (value.includes('(Практ.)') || value.includes('Практика')) return 'Практика';
  if (value.includes('(Сем.)') || value.includes('Семинар')) return 'Семинар';

  return '';
}

function capitalizeFirst(text) {
  if (!text) {
    return '';
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatGap(minutes) {
  if (minutes <= 0) {
    return 'Сейчас идёт занятие';
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours} ч ${mins} мин`;
  }

  if (hours > 0) {
    return `${hours} ч`;
  }

  return `${mins} мин`;
}

function buildLocation(item) {
  const locationParts = [];

  if (item?.frame) {
    locationParts.push(`Корпус ${item.frame}`);
  }

  if (item?.classroom) {
    locationParts.push(`ауд. ${item.classroom}`);
  }

  return locationParts.join(', ');
}

function formatScheduleUpdatedAt(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date).replace(',', '');
}

function SideCard({ icon: Icon, title, children }) {
  return (
    <section className="section-reveal rounded-[1.5rem] border border-slate-200/70 bg-white/80 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-md dark:border-slate-800/70 dark:bg-[#121927] dark:shadow-black/20 sm:rounded-[1.75rem] sm:p-5">
      <div className="mb-3 flex items-center gap-2.5 sm:mb-4 sm:gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-500 dark:bg-emerald-500/10">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-[15px] font-bold text-slate-900 dark:text-white sm:text-base">{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function SchedulePage() {
  const { isAuthenticated, user } = useAuth();
  const [nextLessonData, setNextLessonData] = useState(null);
  const {
    userSchedule,
    scheduleUpdatedAt,
    scheduleLoading,
    selectedDay,
    setSelectedDay,
    weekType,
    setWeekType,
    currentSchedule,
    handleQuickDaySelect,
    getTodayDay,
    getWeekType,
  } = useSchedule(isAuthenticated, user);

  const todayDay = getTodayDay();
  const tomorrowDay = useMemo(() => {
    const dayOrder = [...daysOfWeek, 'Вс'];
    const todayIndex = dayOrder.indexOf(todayDay);
    if (todayIndex === -1) {
      return null;
    }

    return dayOrder[(todayIndex + 1) % dayOrder.length];
  }, [todayDay]);

  useEffect(() => {
    let isMounted = true;

    const loadNextLesson = async () => {
      if (!isAuthenticated || !user?.student_code) {
        if (isMounted) {
          setNextLessonData(null);
        }
        return;
      }

      const response = await api.getNextScheduleLesson(user.student_code);
      if (!isMounted) {
        return;
      }

      if (response.ok && response.success && response.next_lesson) {
        setNextLessonData(response.next_lesson);
        return;
      }

      setNextLessonData(null);
    };

    loadNextLesson();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.student_code]);

  const nextLesson = useMemo(() => {
    if (nextLessonData) {
      return nextLessonData;
    }

    const todaySchedule = todayDay ? (selectedDay === todayDay ? currentSchedule : []) : [];
    const nowMinutes = getCurrentTimeMinutes();

    return todaySchedule.find((lesson) => parseLessonTimeRange(lesson.time).endMinutes > nowMinutes) || null;
  }, [currentSchedule, nextLessonData, selectedDay, todayDay]);

  const todayScheduleActual = useMemo(() => {
    if (!todayDay || !userSchedule || todayDay === 'Вс') {
      return [];
    }

    const fullDayName = DAY_NAME_MAP[todayDay];
    const actualWeekType = getWeekType();
    const dayBucket = userSchedule?.[fullDayName]?.[actualWeekType] || [];

    return dayBucket.map((item, index) => ({
      id: index + 1,
      time: item.time,
      subject: item.subject,
      teacher: item.teacher,
      frame: item.type,
      classroom: item.classroom,
    }));
  }, [getWeekType, todayDay, userSchedule]);

  const lessonGap = useMemo(() => {
    if (!todayDay || todayScheduleActual.length === 0) {
      return null;
    }

    const nowMinutes = getCurrentTimeMinutes();
    const normalizedTodaySchedule = todayScheduleActual.map((lesson) => ({
      lesson,
      ...parseLessonTimeRange(lesson.time),
    }));

    const upcomingLessonIndex = normalizedTodaySchedule.findIndex(({ startMinutes }) => startMinutes > nowMinutes);
    if (upcomingLessonIndex <= 0) {
      return null;
    }

    const previousLesson = normalizedTodaySchedule[upcomingLessonIndex - 1];
    const upcomingLesson = normalizedTodaySchedule[upcomingLessonIndex];
    const gapMinutes = upcomingLesson.startMinutes - previousLesson.endMinutes;

    if (gapMinutes <= 0) {
      return null;
    }

    return {
      startsInMinutes: gapMinutes,
      start: upcomingLesson.start,
    };
  }, [todayDay, todayScheduleActual]);

  const profileGroup = user?.student_code ? `Группа ${user.student_code}` : 'Группа не указана';
  const facultyLabel = user?.faculty || 'БНТУ';
  const upcomingLocation = buildLocation(nextLesson);
  const nextLessonSubject = capitalizeFirst(cleanLessonSubject(nextLesson?.subject));
  const nextLessonType = inferLessonType(nextLesson?.subject);
  const isTomorrowSelected = selectedDay === tomorrowDay;
  const currentWeekType = getWeekType();
  const tomorrowWeekType =
    todayDay === 'Вс' ? (currentWeekType === 'lower' ? 'upper' : 'lower') : currentWeekType;
  const scheduleUpdatedAtLabel = useMemo(() => formatScheduleUpdatedAt(scheduleUpdatedAt), [scheduleUpdatedAt]);

  return (
    <div className="mx-auto max-w-7xl overflow-x-hidden px-3 sm:px-6">
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className="section-reveal mb-5 pt-[10px] sm:mb-8">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h1 className="text-[2.15rem] font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl">
                  Расписание
                </h1>
              </div>

              <div className="hidden rounded-2xl border border-slate-200/70 bg-white/75 p-1 dark:border-slate-800/70 dark:bg-[#121927] xl:inline-flex">
                <button
                  onClick={() => setWeekType('lower')}
                  className={`h-11 flex-1 rounded-2xl px-4 text-sm font-semibold transition-all duration-300 xl:flex-none xl:px-6 ${
                    weekType === 'lower'
                      ? 'bg-slate-200 text-slate-700 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  1 неделя
                </button>
                <button
                  onClick={() => setWeekType('upper')}
                  className={`h-11 flex-1 rounded-2xl px-4 text-sm font-semibold transition-all duration-300 xl:flex-none xl:px-6 ${
                    weekType === 'upper'
                      ? 'bg-slate-200 text-slate-700 shadow-sm dark:bg-slate-700 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  2 неделя
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400 sm:mt-4 sm:gap-3">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200/70 bg-white/70 px-3 py-2 text-[13px] font-medium text-slate-700 shadow-sm dark:border-slate-800/70 dark:bg-[#121927] dark:text-slate-300 sm:px-4 sm:text-sm">
                <GraduationCap className="h-4 w-4 text-emerald-500" />
                <span>{profileGroup}</span>
              </div>
              <span className="hidden text-slate-400 dark:text-slate-600 sm:inline">•</span>
              <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300 sm:text-base">{facultyLabel}</span>
            </div>

            <div className="mt-3 inline-flex w-full rounded-2xl border border-slate-200/70 bg-white/75 p-1 dark:border-slate-800/70 dark:bg-[#121927] xl:hidden">
              <button
                onClick={() => setWeekType('lower')}
                className={`h-11 flex-1 rounded-2xl px-4 text-sm font-semibold transition-all duration-300 ${
                  weekType === 'lower'
                    ? 'bg-slate-200 text-slate-700 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                1 неделя
              </button>
              <button
                onClick={() => setWeekType('upper')}
                className={`h-11 flex-1 rounded-2xl px-4 text-sm font-semibold transition-all duration-300 ${
                  weekType === 'upper'
                    ? 'bg-slate-200 text-slate-700 shadow-sm dark:bg-slate-700 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                2 неделя
              </button>
            </div>
          </div>

          <div className="section-reveal mb-4 flex flex-col gap-3 sm:mb-6 sm:gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="grid gap-4 xl:flex xl:flex-1 xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                {quickDayButtons.map((button) => {
                  const meta = QUICK_BUTTON_META[button.id];
                  const Icon = meta.icon;
                  const isActive =
                    (button.id === 'today' &&
                      selectedDay === todayDay &&
                      weekType === currentWeekType) ||
                    (button.id === 'tomorrow' &&
                      isTomorrowSelected &&
                      weekType === tomorrowWeekType);

                  return (
                    <button
                      key={button.id}
                      onClick={() => handleQuickDaySelect(button.id)}
                      className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition-all duration-300 sm:h-12 sm:px-5 ${
                        isActive
                          ? 'border-emerald-400/70 bg-emerald-500/12 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400'
                          : 'border-slate-200/70 bg-white/75 text-slate-700 hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-800/70 dark:bg-[#121927] dark:text-slate-300 dark:hover:border-emerald-500/30 dark:hover:text-emerald-400'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-6 gap-2 sm:flex sm:flex-wrap sm:items-center xl:justify-end">
                {daysOfWeek.map((day) => (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`aspect-square min-h-[46px] rounded-2xl border px-0 text-sm font-semibold transition-all duration-300 sm:h-12 sm:min-h-0 sm:min-w-[56px] sm:flex-none sm:px-4 ${
                      selectedDay === day
                        ? 'border-emerald-400/70 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                        : 'border-slate-200/70 bg-white/75 text-slate-600 hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-800/70 dark:bg-[#121927] dark:text-slate-300 dark:hover:border-emerald-500/30 dark:hover:text-emerald-400'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {scheduleLoading ? (
            <div className="section-reveal flex min-h-[260px] items-center justify-center rounded-[1.5rem] border border-slate-200/70 bg-white/80 shadow-lg shadow-slate-900/5 backdrop-blur-md dark:border-slate-800/70 dark:bg-[#121927] dark:shadow-black/20 sm:min-h-[320px] sm:rounded-[1.75rem]">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-600 dark:text-slate-300 sm:text-base">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                Загрузка расписания...
              </div>
            </div>
          ) : !isAuthenticated ? (
            <div className="section-reveal rounded-[1.5rem] border border-slate-200/70 bg-white/80 px-5 py-8 text-center shadow-lg shadow-slate-900/5 backdrop-blur-md dark:border-slate-800/70 dark:bg-[#121927] dark:shadow-black/20 sm:rounded-[1.75rem] sm:px-6 sm:py-10">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Войдите в аккаунт</h3>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                После входа здесь появится персональное расписание вашей группы.
              </p>
            </div>
          ) : !userSchedule ? (
            <div className="section-reveal rounded-[1.5rem] border border-slate-200/70 bg-white/80 px-5 py-8 text-center shadow-lg shadow-slate-900/5 backdrop-blur-md dark:border-slate-800/70 dark:bg-[#121927] dark:shadow-black/20 sm:rounded-[1.75rem] sm:px-6 sm:py-10">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">Расписание пока недоступно</h3>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                Мы не нашли данные для вашей группы. Попробуйте немного позже.
              </p>
            </div>
          ) : currentSchedule.length === 0 ? (
            <div className="section-reveal rounded-[1.5rem] border border-slate-200/70 bg-white/80 px-5 py-8 text-center shadow-lg shadow-slate-900/5 backdrop-blur-md dark:border-slate-800/70 dark:bg-[#121927] dark:shadow-black/20 sm:rounded-[1.75rem] sm:px-6 sm:py-10">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">На этот день пар нет</h3>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                Можно переключиться на другой день или неделю в верхней панели.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 sm:space-y-3">
              {currentSchedule.map((item, index) => {
                const isHighlighted = nextLesson && item.time === nextLesson.time && item.subject === nextLesson.subject;

                return (
                  <ScheduleItem
                    key={`${selectedDay}-${weekType}-${item.time}-${item.subject}-${index}`}
                    item={item}
                    highlighted={Boolean(isHighlighted)}
                    revealIndex={index}
                  />
                );
              })}
            </div>
          )}

          {scheduleUpdatedAtLabel ? (
            <div className="section-reveal mt-5 hidden text-[13px] text-slate-600 dark:text-slate-400 sm:mt-6 sm:block sm:text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">Расписание обновлено:</span>{' '}
              {scheduleUpdatedAtLabel}
            </div>
          ) : null}
        </div>

        <aside className="min-w-0 space-y-4 sm:space-y-5">
          <SideCard icon={Clock3} title="Следующее занятие">
            {nextLesson ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
                    {parseLessonTimeRange(nextLesson.time).start}
                  </div>
                  {nextLessonType ? (
                    <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                      {nextLessonType}
                    </span>
                  ) : null}
                </div>
                <h4 className="text-[1.05rem] font-bold leading-tight text-slate-900 dark:text-white sm:text-lg">{nextLessonSubject}</h4>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-600 dark:text-slate-400 sm:text-[13px]">
                  {upcomingLocation ? (
                    <>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPinned className="h-3.5 w-3.5 flex-none text-emerald-500" />
                        <span className="font-medium">{upcomingLocation}</span>
                      </span>
                      {nextLesson.teacher ? <span className="text-slate-300 dark:text-slate-600">|</span> : null}
                    </>
                  ) : null}
                  {nextLesson.teacher ? <span className="whitespace-nowrap">{nextLesson.teacher}</span> : <span className="whitespace-nowrap">Преподаватель будет указан позже</span>}
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-slate-600 dark:text-slate-400 sm:text-[13px]">
                На сегодня новых занятий уже нет. Можно спокойно выдохнуть.
              </p>
            )}
          </SideCard>

          <SideCard icon={Coffee} title="Окно между парами">
            {lessonGap ? (
              <div className="space-y-3">
                <div className="text-[1.45rem] font-bold tracking-tight text-emerald-500 sm:text-[1.65rem]">
                  {formatGap(lessonGap.startsInMinutes)}
                </div>
                <p className="text-[12px] text-slate-600 dark:text-slate-400 sm:text-[13px]">До {lessonGap.start}</p>
              </div>
            ) : (
              <p className="text-[12px] text-slate-600 dark:text-slate-400 sm:text-[13px]">
                Сегодня больших окон больше не ожидается.
              </p>
            )}
          </SideCard>
          {/* НЕ УДАЛЯТЬ */}
          {SHOW_ROUTE_CARD && (
          <SideCard icon={Route} title="Навигация по корпусам">
            <div className="mb-4 overflow-hidden rounded-[1.35rem] border border-slate-200/70 bg-slate-100/80 dark:border-slate-800/70 dark:bg-[#0F1522] sm:rounded-[1.5rem]">
              <div className="flex h-32 items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(16,185,129,0.18),_transparent_58%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,41,59,0.85))] sm:h-40">
                <MapPinned className="h-10 w-10 text-emerald-400 sm:h-12 sm:w-12" />
              </div>
            </div>
            <div className="space-y-4">
              <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
              {upcomingLocation || 'Корпус и аудитория появятся вместе с ближайшей парой'}
              </p>
              <button className="inline-flex w-full items-center justify-between rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-[13px] font-semibold text-slate-700 transition-all duration-300 hover:border-emerald-300 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-emerald-500/30 dark:hover:text-emerald-400">
              <span>Построить маршрут</span>
                <Route className="h-4 w-4" />
              </button>
            </div>
          </SideCard>
          )}

          {scheduleUpdatedAtLabel ? (
            <div className="section-reveal text-[13px] text-slate-600 dark:text-slate-400 sm:hidden">
              <span className="font-medium text-slate-700 dark:text-slate-300">Расписание обновлено:</span>{' '}
              {scheduleUpdatedAtLabel}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

export default SchedulePage;

