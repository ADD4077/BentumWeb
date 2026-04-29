import { useState, useEffect, useCallback, useMemo } from 'react';
import { API_ENDPOINTS } from '../config/api.js';

const getLessonType = (subject) => {
  if (subject.includes('(Лекц.)') || subject.includes('Лекция')) return 'Лекция';
  if (subject.includes('(Лаб.)') || subject.includes('Лабораторная')) return 'Лабораторная';
  if (subject.includes('(Практ.)') || subject.includes('Практика')) return 'Практика';
  return 'Лекция';
};

export const useSchedule = (isAuthenticated, user) => {
  const [userSchedule, setUserSchedule] = useState(null);
  const [scheduleUpdatedAt, setScheduleUpdatedAt] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Пн');
  const [weekType, setWeekType] = useState('lower');

  const getMoscowTime = useCallback(() => {
    const now = new Date();
    const moscowTime = new Date(now.getTime() + (3 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
    return moscowTime;
  }, []);

  const getTodayDay = useCallback(() => {
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const moscowTime = getMoscowTime();
    const today = moscowTime.getDay();
    if (today === 0) return 'Вс';
    return days[today - 1];
  }, [getMoscowTime]);

  const getTomorrowDay = useCallback(() => {
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const moscowTime = getMoscowTime();
    const today = moscowTime.getDay();
    const tomorrow = (today + 1) % 7;
    if (tomorrow === 0) return 'Вс';
    return days[tomorrow - 1];
  }, [getMoscowTime]);

  const getWeekType = useCallback(() => {
    const moscowTime = getMoscowTime();
    const startDate = new Date('2025-09-01T00:00:00');
    const diffTime = moscowTime.getTime() - startDate.getTime();
    const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000));
    return diffWeeks % 2 === 0 ? 'lower' : 'upper';
  }, [getMoscowTime]);

  useEffect(() => {
    const todayDay = getTodayDay();
    if (!todayDay) return;

    setSelectedDay(todayDay);
    setWeekType(getWeekType());
  }, [getTodayDay, getWeekType]);

  const loadUserSchedule = useCallback(async () => {
    if (!user?.student_code) return;
    setScheduleLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.SCHEDULE, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserSchedule(data.schedule);
          setScheduleUpdatedAt(data.schedule_updated_at || null);
        }
      }
    } catch (error) {
      console.error('Schedule load error:', error);
    } finally {
      setScheduleLoading(false);
    }
  }, [user?.student_code]);

  useEffect(() => {
    if (isAuthenticated && user?.student_code) {
      loadUserSchedule();
    }
  }, [isAuthenticated, user?.student_code, loadUserSchedule]);

  const getScheduleForDay = useCallback((day) => {
    if (!userSchedule) return [];
    if (day === 'Вс') return [];

    const dayMapping = {
      'Пн': 'Понедельник',
      'Вт': 'Вторник',
      'Ср': 'Среда',
      'Чт': 'Четверг',
      'Пт': 'Пятница',
      'Сб': 'Суббота'
    };

    const fullDayName = dayMapping[day];
    const weekTypeKey = weekType;

    if (!userSchedule[fullDayName]) return [];
    if (!userSchedule[fullDayName][weekTypeKey]) return [];

    const daySchedule = userSchedule[fullDayName][weekTypeKey];
    return daySchedule.map((item, index) => ({
      id: index + 1,
      time: item.time,
      subject: item.subject,
      teacher: item.teacher,
      frame: item.type,
      classroom: item.classroom,
      type: getLessonType(item.subject)
    }));
  }, [userSchedule, weekType]);

  const handleQuickDaySelect = useCallback((dayType) => {
    if (dayType === 'today') {
      const todayDay = getTodayDay();
      if (todayDay) {
        setSelectedDay(todayDay);
        setWeekType(getWeekType());
      }
    } else if (dayType === 'tomorrow') {
      const tomorrowDay = getTomorrowDay();
      if (tomorrowDay) {
        setSelectedDay(tomorrowDay);
        setWeekType(getWeekType());
      }
    }
  }, [getTodayDay, getTomorrowDay, getWeekType]);

  const currentSchedule = useMemo(() => getScheduleForDay(selectedDay), [getScheduleForDay, selectedDay]);

  return {
    userSchedule,
    scheduleUpdatedAt,
    scheduleLoading,
    selectedDay,
    setSelectedDay,
    weekType,
    setWeekType,
    currentSchedule,
    loadUserSchedule,
    getTodayDay,
    getTomorrowDay,
    getWeekType,
    handleQuickDaySelect
  };
};

export default useSchedule;
