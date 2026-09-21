import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { calendarAPI } from '../../services/api';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import SEO from '../seo/SEO';
import {
  CalendarCategory,
  CalendarEvent,
} from '../../types';
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ListBulletIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, parseISO, addMonths, subMonths, startOfWeek, endOfWeek, isToday, startOfDay, isValid, differenceInCalendarDays } from 'date-fns';
import { de } from 'date-fns/locale';
import clsx from 'clsx';

interface DayEvent {
  event: CalendarEvent;
  category: CalendarCategory | undefined;
}

interface CalendarEventRange {
  start: Date;
  end: Date;
}

interface WeekEventSegment extends DayEvent {
  startColumn: number;
  endColumn: number;
  lane: number;
  continuesFromPreviousWeek: boolean;
  continuesIntoNextWeek: boolean;
}

const getEventDateRange = (event: CalendarEvent): CalendarEventRange | null => {
  const start = parseISO(event.start);
  if (!isValid(start)) return null;

  const parsedEnd = parseISO(event.end || '');
  const end = isValid(parsedEnd) && parsedEnd > start
    // Calendar event ends are exclusive. Moving back one millisecond keeps an
    // event ending at midnight out of the following day.
    ? new Date(parsedEnd.getTime() - 1)
    : start;

  return {
    start: startOfDay(start),
    end: startOfDay(end),
  };
};

const getWeekEventSegments = (weekDays: Date[], events: DayEvent[]): WeekEventSegment[] => {
  const weekStart = weekDays[0];
  const weekEnd = weekDays[weekDays.length - 1];

  const segments = events.flatMap((entry) => {
    const range = getEventDateRange(entry.event);
    if (!range || range.end < weekStart || range.start > weekEnd) return [];

    const clippedStart = range.start < weekStart ? weekStart : range.start;
    const clippedEnd = range.end > weekEnd ? weekEnd : range.end;

    return [{
      ...entry,
      range,
      startColumn: differenceInCalendarDays(clippedStart, weekStart),
      endColumn: differenceInCalendarDays(clippedEnd, weekStart),
    }];
  }).sort((a, b) => {
    const aLength = differenceInCalendarDays(a.range.end, a.range.start);
    const bLength = differenceInCalendarDays(b.range.end, b.range.start);

    return Number(bLength > 0) - Number(aLength > 0)
      || a.startColumn - b.startColumn
      || bLength - aLength
      || a.event.start.localeCompare(b.event.start)
      || a.event.title.localeCompare(b.event.title, 'de');
  });

  const occupiedThroughColumn: number[] = [];

  return segments.map(({ range, ...segment }) => {
    let lane = occupiedThroughColumn.findIndex((endColumn) => endColumn < segment.startColumn);
    if (lane === -1) lane = occupiedThroughColumn.length;
    occupiedThroughColumn[lane] = segment.endColumn;

    return {
      ...segment,
      lane,
      continuesFromPreviousWeek: range.start < weekStart,
      continuesIntoNextWeek: range.end > weekEnd,
    };
  });
};

const parseColor = (color: string): [number, number, number] | null => {
  const value = color.trim().toLowerCase();
  const hex = value.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    const normalized = hex[1].length <= 4
      ? hex[1].split('').map((channel) => channel + channel).join('')
      : hex[1];
    if (normalized.length < 6) return null;
    return [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16),
    ];
  }

  const rgb = value.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null;
};

const getContrastingTextColor = (backgroundColor: string): '#000000' | '#ffffff' => {
  const rgb = parseColor(backgroundColor);
  if (!rgb) return '#ffffff';

  const luminance = rgb.reduce((sum, channel, index) => {
    const normalized = channel / 255;
    const linear = normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
    return sum + linear * [0.2126, 0.7152, 0.0722][index];
  }, 0);
  const blackContrast = (luminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (luminance + 0.05);

  return blackContrast >= whiteContrast ? '#000000' : '#ffffff';
};

const Kalender: React.FC = () => {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] = useState<CalendarCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'list'>('month');
  const overviewRef = useRef<{ key: string } | null>(null);

  if (!token) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-surface-900">Nicht authentifiziert</h3>
          <p className="text-surface-500">Bitte melden Sie sich an, um den Kalender zu sehen.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!token) return;
    const abortController = new AbortController();
    loadCalendarData(abortController.signal);
    return () => abortController.abort();
  }, [token, currentDate.getMonth(), currentDate.getFullYear()]);

  useEffect(() => {
    const eventId = searchParams.get('event');
    const viewId = overviewRef.current?.key;
    if (!eventId || !token || !viewId) return;
    const abort = new AbortController();
    calendarAPI.getEvent(token, eventId, viewId, abort.signal)
      .then(res => {
        if (res.success && res.event) {
          setSelectedEvent(res.event as unknown as CalendarEvent);
        }
      })
      .catch(() => {});
    return () => abort.abort();
  }, [searchParams, token]);

  const loadCalendarData = async (signal?: AbortSignal) => {
    if (!token) return;
    setIsLoading(true);
    setError('');

    try {
      const [overviewRes, eventsRes] = await Promise.all([
        calendarAPI.getOverview(token, signal),
        calendarAPI.getEvents(token, {
          year: 0,
          start: 'year',
          category: selectedCategory,
          search: searchQuery,
        }, signal),
      ]);

      if (signal?.aborted) return;

      if (overviewRes.success) {
        setCategories(overviewRes.categories);
        overviewRef.current = overviewRes.calendar;
      }

      if (eventsRes.success) {
        setEvents(eventsRes.events);
      } else {
        setError('Fehler beim Laden der Termine.');
      }
      setIsLoading(false);
    } catch (err) {
      if (axios.isCancel(err)) return;
      console.error('Error loading calendar:', err);
      setError('Fehler beim Laden der Termine.');
      setIsLoading(false);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (selectedCategory && event.category !== selectedCategory) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(query);
        const matchesDesc = event.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc) return false;
      }
      return true;
    });
  }, [events, selectedCategory, searchQuery]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    filteredEvents.forEach((event) => {
      if (!event.start) return;
      try {
        const dateKey = format(parseISO(event.start), 'yyyy-MM-dd');
        const existing = map.get(dateKey) || [];
        const category = categories.find((c) => String(c.id) === String(event.category));
        existing.push({ event, category });
        map.set(dateKey, existing);
      } catch {
        // Skip invalid dates
      }
    });
    return map;
  }, [filteredEvents, categories]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  const categorizedEvents = useMemo(() => filteredEvents.map((event) => ({
    event,
    category: categories.find((category) => String(category.id) === String(event.category)),
  })), [filteredEvents, categories]);

  const calendarWeeks = useMemo(() => {
    return Array.from({ length: calendarDays.length / 7 }, (_, weekIndex) => {
      const days = calendarDays.slice(weekIndex * 7, weekIndex * 7 + 7);
      return {
        days,
        segments: getWeekEventSegments(days, categorizedEvents),
      };
    });
  }, [calendarDays, categorizedEvents]);

  const goToPrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const closeEventPopup = () => {
    setSelectedEvent(null);
  };

  if (isLoading && events.length === 0) {
    return (
      <div className="h-full flex flex-col p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="page-header flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="skeleton h-9 w-36 rounded-lg" />
            <div className="flex items-center gap-2">
              <div className="skeleton h-10 w-20 rounded-xl" />
              <div className="skeleton h-10 w-20 rounded-xl" />
              <div className="skeleton h-10 w-20 rounded-xl" />
              <div className="skeleton h-10 w-20 rounded-xl" />
            </div>
          </div>
        </div>

        <div className="mb-6 card flex-shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="skeleton h-4 w-14 rounded" />
            <div className="skeleton h-9 w-32 rounded-xl" />
            <div className="skeleton h-9 w-48 rounded-xl" />
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="mb-2 flex-shrink-0 border-b border-surface-200 py-2 dark:border-surface-700">
            <div className="skeleton h-7 w-40 rounded-lg" />
          </div>
          <div className="grid grid-cols-7 gap-px mb-1 flex-shrink-0">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="skeleton h-8 rounded" />
            ))}
          </div>
          <div className="flex-1 min-h-0 grid grid-cols-7 auto-rows-[80px] sm:auto-rows-[160px] content-start gap-px bg-surface-200 dark:bg-surface-700 rounded-xl overflow-hidden border border-surface-100 dark:border-surface-700">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-surface-900 min-h-0 p-1 sm:p-1.5">
                <div className="skeleton h-6 w-6 rounded-full mb-1" />
                <div className="space-y-0.5">
                  {i % 4 === 0 && <div className="skeleton h-4 w-full rounded" />}
                  {i % 5 === 0 && <div className="skeleton h-4 w-4/5 rounded" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 sm:p-6 max-w-7xl mx-auto">
      <SEO
        title="Kalender"
        description="Lanis Kalender — Behalte den Überblick über Termine, Klausuren und Veranstaltungen im Schulportal Hessen."
        path="/calendar"
        noindex
      />
      <div className="page-header flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Kalender</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToToday}
              className="btn btn-secondary"
            >
              Heute
            </button>
            <div className="flex bg-surface-100 dark:bg-surface-800 rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
              <button
                onClick={() => setCalendarViewMode('month')}
                className={clsx(
                  'p-2 transition-colors',
                  calendarViewMode === 'month'
                    ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400'
                    : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700'
                )}
                title="Monatsansicht"
              >
                <Squares2X2Icon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCalendarViewMode('list')}
                className={clsx(
                  'p-2 transition-colors border-l border-surface-200 dark:border-surface-700',
                  calendarViewMode === 'list'
                    ? 'bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400'
                    : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700'
                )}
                title="Listenansicht"
              >
                <ListBulletIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="flex bg-surface-100 dark:bg-surface-800 rounded-xl overflow-hidden border border-surface-200 dark:border-surface-700">
              <button
                onClick={goToPrevMonth}
                className="p-2 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                onClick={goToNextMonth}
                className="p-2 text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors border-l border-surface-200 dark:border-surface-700"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm animate-scale-in flex-shrink-0">
          {error}
        </div>
      )}

      <div className="mb-6 card flex-shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <FunnelIcon className="h-3.5 w-3.5 text-surface-400" />
            <span className="text-xs font-medium text-surface-600">Filter:</span>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input text-xs py-1.5 w-auto"
          >
            <option value="">Alle Kategorien</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <div className="relative">
            <MagnifyingGlassIcon className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input text-xs py-1.5 pl-9 w-48"
            />
          </div>
        </div>
      </div>

      {/* Month View */}
      {calendarViewMode === 'month' && (
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="sticky top-0 z-10 mb-2 flex-shrink-0 border-b border-surface-200 bg-surface-50/95 py-2 backdrop-blur dark:border-surface-700 dark:bg-surface-950/95">
          <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
            {format(currentDate, 'MMMM yyyy', { locale: de })}
          </h2>
        </div>
        <div className="grid grid-cols-7 gap-px mb-1 flex-shrink-0">
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-surface-400 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden rounded-xl border border-surface-100 bg-surface-200 dark:border-surface-700 dark:bg-surface-700">
          {calendarWeeks.map(({ days, segments }) => (
            <div
              key={format(days[0], 'yyyy-MM-dd')}
              className="relative min-h-[80px] border-b border-surface-200 last:border-b-0 sm:min-h-[160px] dark:border-surface-700"
            >
              <div className="absolute inset-0 grid grid-cols-7 gap-px bg-surface-200 dark:bg-surface-700">
                {days.map((day) => {
                  const dateKey = format(day, 'yyyy-MM-dd');
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isCurrentDay = isToday(day);

                  return (
                    <div
                      key={dateKey}
                      className={clsx(
                        'min-h-0 overflow-hidden bg-white p-1 transition-colors sm:p-1.5 dark:bg-surface-900',
                        !isCurrentMonth && 'bg-surface-50 text-surface-300 dark:!bg-surface-900 dark:text-surface-600'
                      )}
                    >
                      <div className={clsx(
                        'flex h-6 w-6 items-center justify-center text-xs font-medium',
                        isCurrentDay && 'rounded-full bg-primary-600 text-white'
                      )}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pointer-events-none relative grid grid-cols-7 auto-rows-[20px] gap-y-0.5 px-0 pb-1 pt-8 sm:pt-9">
                {segments.map(({
                  event,
                  category,
                  startColumn,
                  endColumn,
                  lane,
                  continuesFromPreviousWeek,
                  continuesIntoNextWeek,
                }) => {
                  const backgroundColor = category?.color || event.category_color;

                  return (
                    <button
                      key={event.id}
                      onClick={() => handleEventClick(event)}
                      title={event.title}
                      className={clsx(
                        'pointer-events-auto z-[1] mx-1 block min-w-0 truncate rounded px-1 py-0.5 text-left text-[11px] transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 sm:mx-1.5',
                        continuesFromPreviousWeek && 'rounded-l-none',
                        continuesIntoNextWeek && 'rounded-r-none',
                        !backgroundColor && 'bg-surface-100 text-surface-700 hover:bg-surface-200 dark:bg-surface-700 dark:text-surface-300 dark:hover:bg-surface-600'
                      )}
                      style={{
                        gridColumn: `${startColumn + 1} / ${endColumn + 2}`,
                        gridRow: lane + 1,
                        ...(backgroundColor ? {
                          backgroundColor,
                          color: getContrastingTextColor(backgroundColor),
                        } : {}),
                      }}
                    >
                      {event.title}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* List / Agenda View */}
      {calendarViewMode === 'list' && (
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="sticky top-0 z-10 mb-2 flex-shrink-0 border-b border-surface-200 bg-surface-50/95 py-2 backdrop-blur dark:border-surface-700 dark:bg-surface-950/95">
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
              {format(currentDate, 'MMMM yyyy', { locale: de })}
            </h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto space-y-1">
          {(() => {
            const sortedDates = Array.from(eventsByDate.entries())
              .filter(([dateKey]) => isSameMonth(parseISO(dateKey), currentDate))
              .sort(([a], [b]) => a.localeCompare(b));
            if (sortedDates.length === 0) {
              return (
                <div className="card text-center py-12">
                  <CalendarDaysIcon className="mx-auto h-12 w-12 text-surface-300 dark:text-surface-600" />
                  <h3 className="mt-2 text-sm font-medium text-surface-700 dark:text-surface-300">Keine Termine</h3>
                  <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                    Keine Termine im {format(currentDate, 'MMMM yyyy', { locale: de })} gefunden.
                  </p>
                </div>
              );
            }
            return sortedDates.map(([dateKey, dayEvents]) => {
              const dayDate = parseISO(dateKey);
              return (
                <div key={dateKey} className="card bg-transparent">
                  <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100 mb-3 flex items-center gap-2">
                    <span className={clsx(
                      'w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold',
                      isToday(dayDate) ? 'bg-primary-600 text-white' : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                    )}>
                      {format(dayDate, 'd')}
                    </span>
                    {format(dayDate, 'EEEE, d. MMMM yyyy', { locale: de })}
                  </h3>
                  <div className="space-y-2">
                    {dayEvents.map(({ event, category }, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleEventClick(event)}
                        className="w-full text-left p-3 rounded-xl bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors flex items-center gap-3"
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category?.color || '#888' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{event.title}</p>
                          {!event.all_day && event.start && (
                            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                              {format(parseISO(event.start), 'HH:mm', { locale: de })}
                              {event.end && ` - ${format(parseISO(event.end), 'HH:mm', { locale: de })}`}
                            </p>
                          )}
                        </div>
                        {category?.name && (
                          <span className="text-[11px] text-surface-400 flex-shrink-0">{category.name}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            });
          })()}
          </div>
        </div>
      )}

      {/* Event Popup Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={closeEventPopup}
          />
          <div className="relative bg-white dark:bg-surface-800 rounded-2xl sm:rounded-2xl shadow-soft-lg max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in mx-2 sm:mx-0">
            <div className="flex items-start justify-between p-6 border-b border-surface-100 dark:border-surface-700">
              <div>
                <h2 className="text-xl font-bold text-surface-900 dark:text-surface-100">{selectedEvent.title}</h2>
                <div className="flex items-center gap-2 mt-1.5 text-surface-500 text-sm">
                  <CalendarDaysIcon className="h-4 w-4" />
                  <span>
                    {selectedEvent.start && format(parseISO(selectedEvent.start), 'EEEE, d. MMMM yyyy', { locale: de })}
                  </span>
                </div>
              </div>
              <button
                onClick={closeEventPopup}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {/* Category badge */}
              <div className="flex items-center gap-2 mb-4">
                {selectedEvent.category_color && (
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: selectedEvent.category_color }}
                  />
                )}
                <span className="text-sm text-surface-600">
                  {selectedEvent.category_name || 'Keine Kategorie'}
                </span>
                {selectedEvent.all_day && (
                  <span className="ml-2 text-xs bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 px-2 py-0.5 rounded">Ganztägig</span>
                )}
              </div>

              {/* Time */}
              {!selectedEvent.all_day && selectedEvent.start && (
                <div className="text-sm text-surface-600 mb-4">
                  {format(parseISO(selectedEvent.start), 'HH:mm', { locale: de })}
                  {selectedEvent.end && ` - ${format(parseISO(selectedEvent.end), 'HH:mm', { locale: de })}`}
                </div>
              )}

              {/* Description */}
              {selectedEvent.description && (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: selectedEvent.description }} />
                </div>
              )}

              {/* Properties */}
              {selectedEvent.properties && Object.keys(selectedEvent.properties).length > 0 && (
                <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
                  <dl className="space-y-2">
                    {Object.entries(selectedEvent.properties).map(([key, value]) => (
                      <div key={key} className="flex">
                        <dt className="text-sm text-surface-500 w-24 flex-shrink-0">{key}</dt>
                        <dd className="text-sm text-surface-900 dark:text-surface-100">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Kalender;
