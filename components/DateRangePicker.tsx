'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import 'cally';

// Extender tipos para los web components de cally
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'calendar-range': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          value?: string;
          min?: string;
          max?: string;
          months?: number;
        },
        HTMLElement
      >;
      'calendar-month': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          offset?: number;
        },
        HTMLElement
      >;
    }
  }
}

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

type PresetKey = 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth' | 'all';

const presets: { key: PresetKey; label: string; getRange: () => DateRange }[] = [
  {
    key: 'today',
    label: 'Hoy',
    getRange: () => ({
      start: startOfDay(new Date()),
      end: endOfDay(new Date()),
    }),
  },
  {
    key: 'yesterday',
    label: 'Ayer',
    getRange: () => ({
      start: startOfDay(subDays(new Date(), 1)),
      end: endOfDay(subDays(new Date(), 1)),
    }),
  },
  {
    key: 'week',
    label: 'Últimos 7 días',
    getRange: () => ({
      start: startOfDay(subDays(new Date(), 6)),
      end: endOfDay(new Date()),
    }),
  },
  {
    key: 'month',
    label: 'Últimos 30 días',
    getRange: () => ({
      start: startOfDay(subDays(new Date(), 29)),
      end: endOfDay(new Date()),
    }),
  },
  {
    key: 'lastMonth',
    label: 'Mes anterior',
    getRange: () => ({
      start: startOfMonth(subMonths(new Date(), 1)),
      end: endOfMonth(subMonths(new Date(), 1)),
    }),
  },
  {
    key: 'all',
    label: 'Todo',
    getRange: () => ({ start: null, end: null }),
  },
];

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [calendarValue, setCalendarValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLElement>(null);

  // Sincronizar value prop con el calendario
  useEffect(() => {
    if (value.start && value.end) {
      const startStr = format(value.start, 'yyyy-MM-dd');
      const endStr = format(value.end, 'yyyy-MM-dd');
      setCalendarValue(`${startStr}/${endStr}`);
    } else {
      setCalendarValue('');
    }
  }, [value]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Manejar cambio del calendario
  useEffect(() => {
    const calendar = calendarRef.current;
    if (!calendar) return;

    const handleChange = (e: Event) => {
      const target = e.target as HTMLElement & { value: string };
      const val = target.value;
      setCalendarValue(val);

      if (val && val.includes('/')) {
        const [startStr, endStr] = val.split('/');
        if (startStr && endStr) {
          onChange({
            start: startOfDay(new Date(startStr)),
            end: endOfDay(new Date(endStr)),
          });
        }
      }
    };

    calendar.addEventListener('change', handleChange);
    return () => calendar.removeEventListener('change', handleChange);
  }, [onChange, isOpen]);

  const handlePresetClick = (preset: typeof presets[0]) => {
    const range = preset.getRange();
    onChange(range);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange({ start: null, end: null });
    setCalendarValue('');
  };

  const getDisplayText = () => {
    if (!value.start || !value.end) return 'Todas las fechas';

    const startStr = format(value.start, 'd MMM', { locale: es });
    const endStr = format(value.end, 'd MMM yyyy', { locale: es });

    // Si es el mismo día
    if (format(value.start, 'yyyy-MM-dd') === format(value.end, 'yyyy-MM-dd')) {
      return format(value.start, "d 'de' MMMM", { locale: es });
    }

    return `${startStr} - ${endStr}`;
  };

  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-secondary/50 hover:bg-secondary border border-border/50 rounded-lg text-sm font-medium transition-all duration-200"
      >
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span>{getDisplayText()}</span>
        {(value.start || value.end) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="ml-1 p-0.5 rounded hover:bg-secondary-foreground/10"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in">
          <div className="flex">
            {/* Presets */}
            <div className="w-40 border-r border-border bg-secondary/30 p-2 space-y-1">
              <p className="text-xs font-medium text-muted-foreground px-2 py-1">Rápido</p>
              {presets.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => handlePresetClick(preset)}
                  className="w-full text-left px-3 py-1.5 text-sm rounded-md hover:bg-secondary transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Calendar */}
            <div className="p-4">
              <calendar-range
                ref={calendarRef as React.RefObject<HTMLElement>}
                value={calendarValue}
                max={today}
                months={2}
              >
                <div className="flex gap-4">
                  <div className="cally-month-wrapper">
                    <calendar-month></calendar-month>
                  </div>
                  <div className="cally-month-wrapper">
                    <calendar-month offset={1}></calendar-month>
                  </div>
                </div>
              </calendar-range>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
