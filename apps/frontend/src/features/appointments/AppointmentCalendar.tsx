import { useMemo, useState } from 'react';

import { formatLocalDate, parseLocalDate } from './appointment-helpers';

const monthFormatter = new Intl.DateTimeFormat('es-CL', {
  month: 'long',
  year: 'numeric',
});
const dayFormatter = new Intl.DateTimeFormat('es-CL', {
  day: 'numeric',
  month: 'long',
  weekday: 'long',
  year: 'numeric',
});
const weekdayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface AppointmentCalendarProps {
  minDate: string;
  onChange: (date: string) => void;
  value: string;
}

export function AppointmentCalendar({
  minDate,
  onChange,
  value,
}: AppointmentCalendarProps) {
  const selectedDate = parseLocalDate(value);
  const minimumDate = parseLocalDate(minDate);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    startOfMonth(selectedDate),
  );

  const days = useMemo(() => buildMonthDays(visibleMonth), [visibleMonth]);
  const previousMonthDisabled =
    startOfMonth(visibleMonth).getTime() <= startOfMonth(minimumDate).getTime();

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d0d]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-5">
        <button
          aria-label="Mes anterior"
          className="hover:border-primary hover:text-primary grid size-10 place-items-center rounded-full border border-white/10 text-lg transition disabled:cursor-not-allowed disabled:opacity-25"
          disabled={previousMonthDisabled}
          onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
          type="button"
        >
          ←
        </button>
        <p
          aria-live="polite"
          className="font-display text-sm font-bold tracking-[0.08em] capitalize uppercase sm:text-base"
        >
          {monthFormatter.format(visibleMonth)}
        </p>
        <button
          aria-label="Mes siguiente"
          className="hover:border-primary hover:text-primary grid size-10 place-items-center rounded-full border border-white/10 text-lg transition"
          onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
          type="button"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-white/10 bg-white/[0.025] px-2 sm:px-4">
        {weekdayLabels.map((label) => (
          <span
            className="text-muted py-3 text-center text-[10px] font-semibold tracking-[0.12em] uppercase"
            key={label}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 p-2 sm:gap-2 sm:p-4">
        {days.map((day, index) => {
          if (!day)
            return <span aria-hidden="true" key={`empty-day-${index}`} />;

          const isoDate = formatLocalDate(day);
          const isSelected = isoDate === value;
          const isPast = day.getTime() < startOfDay(minimumDate).getTime();
          const isSunday = day.getDay() === 0;
          const disabled = isPast || isSunday;

          return (
            <button
              aria-label={dayFormatter.format(day)}
              aria-pressed={isSelected}
              className={`relative aspect-square rounded-xl text-sm font-semibold transition sm:text-base ${
                isSelected
                  ? 'bg-primary text-white shadow-[0_8px_22px_rgba(230,0,35,.28)]'
                  : disabled
                    ? 'cursor-not-allowed text-white/20'
                    : 'bg-white/[0.035] text-[#e8e8e8] hover:bg-white/10 hover:text-white'
              }`}
              disabled={disabled}
              key={isoDate}
              onClick={() => onChange(isoDate)}
              type="button"
            >
              {day.getDate()}
              {isSelected && (
                <span className="absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-white" />
              )}
            </button>
          );
        })}
      </div>

      <div className="text-muted flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 px-4 py-3 text-[11px] sm:px-5">
        <span className="flex items-center gap-2">
          <span className="bg-primary size-2 rounded-full" /> Día seleccionado
        </span>
        <span>Domingos sin atención</span>
      </div>
    </div>
  );
}

function buildMonthDays(month: Date): Array<Date | null> {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1, 12);
  const mondayFirstOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0, 12).getDate();
  return [
    ...Array.from<null>({ length: mondayFirstOffset }).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, index) => new Date(year, monthIndex, index + 1, 12),
    ),
  ];
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1, 12);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
