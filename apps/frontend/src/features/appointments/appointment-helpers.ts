/**
 * Shared date/time helpers for the appointment booking flow.
 *
 * Centralises the logic used by the calendar, the full booking page and the
 * in-place booking modal so the rules (local-date formatting, the next
 * bookable day, workshop-timezone minutes) live in a single place.
 */

const WORKSHOP_TIME_ZONE = 'America/Santiago';

/** Format a Date as a local `YYYY-MM-DD` string (no timezone shift). */
export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parse a `YYYY-MM-DD` string into a local Date anchored at midday. */
export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year!, month! - 1, day!, 12);
}

/** Today as a local `YYYY-MM-DD` string. */
export function getToday(): string {
  return formatLocalDate(new Date());
}

/** The next bookable day (tomorrow, skipping Sunday) as `YYYY-MM-DD`. */
export function getNextBookableDate(): string {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 1);
  if (nextDate.getDay() === 0) nextDate.setDate(nextDate.getDate() + 1);
  return formatLocalDate(nextDate);
}

/** Minutes since midnight for an ISO instant, in the workshop timezone. */
export function getWorkshopMinutes(value: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    timeZone: WORKSHOP_TIME_ZONE,
  }).formatToParts(new Date(value));
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === 'minute')?.value ?? 0,
  );
  return hour * 60 + minute;
}

/** Persists the last booked appointment id so the receipt page can recover it. */
export const LAST_APPOINTMENT_KEY = 'drp_last_appointment';

/** Mirrors the backend ChileanPhoneSchema: +56 9 XXXX XXXX once separators stripped. */
export function isValidChileanPhone(value: string): boolean {
  return /^\+569\d{8}$/.test(value.replace(/[\s()-]/g, ''));
}
