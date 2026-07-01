export type AgendaView = 'day' | 'week';

export const agendaDateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  hourCycle: 'h23',
  timeStyle: 'short',
  timeZone: 'America/Santiago',
});

export const agendaTimeFormatter = new Intl.DateTimeFormat('es-CL', {
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  timeZone: 'America/Santiago',
});

export function getWorkshopToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Santiago',
    year: 'numeric',
  }).format(new Date());
}

export function getAgendaRange(date: string, view: AgendaView) {
  const from = view === 'week' ? getWeekStart(date) : date;
  return { from, to: addDays(from, view === 'week' ? 7 : 1) };
}

function getWeekStart(date: string): string {
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

export function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function formatAgendaRange(
  range: { from: string; to: string },
  view: AgendaView,
): string {
  const formatter = new Intl.DateTimeFormat('es-CL', {
    dateStyle: view === 'day' ? 'full' : 'medium',
    timeZone: 'UTC',
  });
  if (view === 'day')
    return formatter.format(new Date(`${range.from}T00:00:00.000Z`));
  return `${formatter.format(new Date(`${range.from}T00:00:00.000Z`))} – ${formatter.format(new Date(`${addDays(range.to, -1)}T00:00:00.000Z`))}`;
}
