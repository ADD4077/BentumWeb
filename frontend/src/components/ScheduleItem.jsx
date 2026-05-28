import React from 'react';
import {
  BookOpen,
  FlaskConical,
  MapPinned,
  Presentation,
  Wrench,
} from 'lucide-react';

import { lessonTypes } from '../utils/constants.js';

const getTypeClass = (type) => lessonTypes[type] || lessonTypes['Практика'];

const getMobileTypeLabel = (type) => {
  if (type === 'Лабораторная') return 'ЛАБ';
  if (type === 'Практика') return 'ПРАКТ';
  if (type === 'Лекция') return 'ЛЕКЦ';
  if (type === 'Семинар') return 'СЕМ';
  return type;
};

const cleanSubjectName = (subject) =>
  String(subject || '')
    .replace(/^\(Лаб\.\)\s*/, '')
    .replace(/^\(Лекц\.\)\s*/, '')
    .replace(/^\(Практ\.\)\s*/, '')
    .replace(/^\(Сем\.\)\s*/, '')
    .trim();

const renderLessonIcon = (type) => {
  const iconClassName = 'h-6 w-6';
  if (type === 'Лабораторная') return <FlaskConical className={iconClassName} />;
  if (type === 'Практика') return <Wrench className={iconClassName} />;
  if (type === 'Лекция') return <Presentation className={iconClassName} />;
  return <BookOpen className={iconClassName} />;
};

function ScheduleItem({ item, highlighted = false, revealIndex = 0 }) {
  const startTime = String(item.time || '').split(' - ')[0];
  const locationLabel = [item.frame ? `Корпус ${item.frame}` : null, item.classroom ? `ауд. ${item.classroom}` : null]
    .filter(Boolean)
    .join(', ');

  return (
    <div
      style={{ animationDelay: `${Math.max(0, revealIndex) * 110}ms` }}
      className={`section-reveal max-w-full overflow-hidden rounded-[1.25rem] border px-3 py-3 shadow-lg shadow-gray-900/10 transition-all duration-300 dark:shadow-black/20 sm:rounded-[1.5rem] sm:px-5 ${
        highlighted
          ? 'border-emerald-400/50 bg-gray-100/70 dark:border-emerald-500/30 dark:bg-[#162131]'
          : 'border-gray-200/70 bg-gray-100/50 dark:border-slate-800/60 dark:bg-[#121927]'
      }`}
    >
      <div className="min-w-0 sm:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <div className="w-[58px] flex-none text-[0.95rem] font-semibold tracking-tight text-slate-900 dark:text-white">
            {startTime}
          </div>
          <div className="h-6 w-px flex-none bg-gray-200/80 dark:bg-slate-800/80" />
          <h3 className="min-w-0 flex-1 truncate text-[0.98rem] font-semibold text-slate-900 dark:text-white">
            {cleanSubjectName(item.subject)}
          </h3>
          <span
            className={`inline-flex max-w-[88px] flex-none items-center rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] shadow-sm ${getTypeClass(
              item.type
            )}`}
          >
            {getMobileTypeLabel(item.type)}
          </span>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-[calc(58px+0.75rem+1px)] text-[12px] text-slate-600 dark:text-slate-400">
          {locationLabel ? (
            <>
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPinned className="h-3 w-3 flex-none text-slate-400 dark:text-slate-500" />
                <span className="truncate font-medium">{locationLabel}</span>
              </span>
              {item.teacher ? <span className="text-slate-300 dark:text-slate-600">|</span> : null}
            </>
          ) : null}
          {item.teacher ? <span className="truncate">{item.teacher}</span> : <span>—</span>}
        </div>
      </div>

      <div className="hidden min-w-0 items-start gap-3 sm:flex">
        <div className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{startTime}</div>
        <div className="h-12 w-px bg-gray-200/80 dark:bg-slate-800/80" />

        <div className="hidden h-12 w-12 flex-none items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 lg:flex">
          {renderLessonIcon(item.type)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-xl font-bold text-slate-900 dark:text-white">
                {cleanSubjectName(item.subject)}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                {locationLabel ? (
                  <>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPinned className="h-4 w-4 flex-none text-slate-400 dark:text-slate-500" />
                      <span className="font-medium">{locationLabel}</span>
                    </span>
                    {item.teacher ? <span className="text-slate-300 dark:text-slate-600">|</span> : null}
                  </>
                ) : null}
                {item.teacher ? <span>{item.teacher}</span> : <span>—</span>}
              </div>
            </div>

            <span
              className={`inline-flex w-fit flex-none items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] shadow-sm ${getTypeClass(
                item.type
              )}`}
            >
              {item.type}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default ScheduleItem;
