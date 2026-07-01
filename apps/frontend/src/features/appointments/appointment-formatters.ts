export const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  hourCycle: 'h23',
  timeZone: 'America/Santiago',
  timeStyle: 'short',
});

export const selectedDateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'full',
});

export const slotTimeFormatter = new Intl.DateTimeFormat('es-CL', {
  hour: '2-digit',
  hourCycle: 'h23',
  minute: '2-digit',
  timeZone: 'America/Santiago',
});
