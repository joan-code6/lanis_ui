import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { calendarAPI } from '../../services/api';
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
} from '@heroicons/react/24/outline';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, parseISO, addMonths, subMonths, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import clsx from 'clsx';

interface DayEvent {
  event: CalendarEvent;
  category: CalendarCategory | undefined;
}

const Kalender: React.FC = () => {
  const { token } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [categories, setCategories] = useState<CalendarCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
    if (token) {
      loadCalendarData();
    }
  }, [token, currentDate.getMonth(), currentDate.getFullYear()]);

  const loadCalendarData = async () => {
    if (!token) return;
    setIsLoading(true);
    setError('');

    try {
      const [overviewRes, eventsRes] = await Promise.all([
        calendarAPI.getOverview(token),
        calendarAPI.getEvents(token, {
          year: 0,
          start: 'year',
          category: selectedCategory,
          search: searchQuery,
        }),
      ]);

      if (overviewRes.success) {
        setCategories(overviewRes.categories);
      }

      if (eventsRes.success) {
        setEvents(eventsRes.events);
      } else {
        setError('Fehler beim Laden der Termine.');
      }
    } catch (err) {
      console.error('Error loading calendar:', err);
      setError('Fehler beim Laden der Termine.');
    } finally {
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
      <div className="p-6">
        <div className="space-y-4">
          <div className="skeleton h-8 w-48"></div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="skeleton h-24"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="page-header">
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
            <div className="flex bg-surface-100 rounded-xl overflow-hidden border border-surface-200">
              <button
                onClick={goToPrevMonth}
                className="p-2 text-surface-500 hover:text-surface-700 hover:bg-surface-50 transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                onClick={goToNextMonth}
                className="p-2 text-surface-500 hover:text-surface-700 hover:bg-surface-50 transition-colors border-l border-surface-200"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm animate-scale-in">
          {error}
        </div>
      )}

      <div className="mb-6 card">
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
      <div>
        <div className="grid grid-cols-7 gap-px mb-1">
          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-surface-400 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-surface-200 dark:bg-surface-700 rounded-xl overflow-hidden border border-surface-100 dark:border-surface-700">
          {calendarDays.map((day) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={dateKey}
                className={clsx(
                  'bg-white dark:bg-surface-900 min-h-[120px] p-1.5 transition-colors',
                  !isCurrentMonth && 'bg-surface-50 dark:!bg-surface-900 text-surface-300 dark:text-surface-600'
                )}
              >
                <div className={clsx(
                  'text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center',
                  isCurrentDay && 'bg-primary-600 text-white rounded-full'
                )}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(({ event, category }, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleEventClick(event)}
                      className={clsx(
                        'w-full text-left text-xs px-1 py-0.5 rounded truncate block',
                        category?.color
                          ? 'text-white'
                          : 'bg-surface-100 text-surface-700 hover:bg-surface-200'
                      )}
                      style={category?.color ? { backgroundColor: category.color } : {}}
                    >
                      {event.title}
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-surface-500 px-1">
                      +{dayEvents.length - 3} weitere
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Popup Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/40 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={closeEventPopup}
          />
          <div className="relative bg-white dark:bg-surface-800 rounded-2xl shadow-soft-lg max-w-lg w-full max-h-[90vh] overflow-y-auto animate-scale-in">
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
                className="w-8 h-8 flex items-center justify-center rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 transition-colors"
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
                  <span className="ml-2 text-xs bg-surface-100 text-surface-600 px-2 py-0.5 rounded">Ganztägig</span>
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