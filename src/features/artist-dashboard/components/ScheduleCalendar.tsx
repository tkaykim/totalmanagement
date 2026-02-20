'use client';

import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, FolderKanban, ListTodo } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { ArtistProject, ArtistTask } from '../types';

interface ScheduleCalendarProps {
  projects: ArtistProject[];
  tasks: ArtistTask[];
}

export function ScheduleCalendar({ projects, tasks }: ScheduleCalendarProps) {
  const [month, setMonth] = useState<Date>(() => new Date());

  const taskDueDates = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => set.add(format(parseISO(t.due_date), 'yyyy-MM-dd')));
    return set;
  }, [tasks]);

  const projectsInMonth = useMemo(() => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    return projects.filter((p) => {
      if (!p.start_date || !p.end_date) return false;
      const s = parseISO(p.start_date);
      const e = parseISO(p.end_date);
      return (
        isWithinInterval(s, { start, end }) ||
        isWithinInterval(e, { start, end }) ||
        (s <= start && e >= end)
      );
    });
  }, [projects, month]);

  const modifiers = useMemo(
    () => ({
      due: (date: Date) => taskDueDates.has(format(date, 'yyyy-MM-dd')),
    }),
    [taskDueDates]
  );

  const modifiersClassNames = useMemo(
    () => ({
      due: 'relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-emerald-500',
    }),
    []
  );

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 sm:p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <CalendarIcon className="h-5 w-5 text-blue-500" />
        <h3 className="font-bold text-slate-800 dark:text-slate-200">일정</h3>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-shrink-0">
          <Calendar
            mode="single"
            month={month}
            onMonthChange={(d) => d && setMonth(d)}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            locale={ko}
            className="rounded-lg border border-slate-100 dark:border-slate-700 p-2"
          />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 align-middle mr-1" />
            할일 마감일
          </p>
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
            <FolderKanban className="h-4 w-4" />
            {format(month, 'yyyy년 M월', { locale: ko })} 프로젝트
          </div>
          {projectsInMonth.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              이번 달에 진행 중인 프로젝트가 없습니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {projectsInMonth.map((p) => (
                <li
                  key={p.id}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border border-slate-100 dark:border-slate-700',
                    'bg-slate-50 dark:bg-slate-900/60 px-3 py-2 text-sm'
                  )}
                >
                  <span className="flex-1 font-medium text-slate-800 dark:text-slate-200 truncate">
                    {p.name}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">
                    {p.start_date ? format(parseISO(p.start_date), 'M/d', { locale: ko }) : '?'} ~{' '}
                    {p.end_date ? format(parseISO(p.end_date), 'M/d', { locale: ko }) : '?'}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 pt-2">
            <ListTodo className="h-4 w-4" />
            이번 달 할일 마감
          </div>
          {tasks.filter((t) => {
            const d = parseISO(t.due_date);
            return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
          }).length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              이번 달 마감 할일이 없습니다.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {tasks
                .filter((t) => {
                  const d = parseISO(t.due_date);
                  return d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear();
                })
                .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                .map((t) => (
                  <li
                    key={t.id}
                    className="text-sm text-slate-700 dark:text-slate-300 flex justify-between gap-2"
                  >
                    <span className="truncate">{t.title}</span>
                    <span className="text-slate-500 dark:text-slate-400 flex-shrink-0">
                      {format(parseISO(t.due_date), 'M/d (EEE)', { locale: ko })}
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
