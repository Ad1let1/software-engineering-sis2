export type Booking = { start: number; end: number; label: string };

export type Verdict =
  | { kind: 'idle' }
  | { kind: 'ok' }
  | { kind: 'error'; message: string };

export type CheckInput = {
  start: number | null;
  end: number | null;
  duration: number;
  blocked: boolean;
  now: number;
  maxDuration: number;
  bookings: Booking[];
};

export const toHHMM = (mins: number): string => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const fromHHMM = (text: string): number | null => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

export const overlaps = (start: number, end: number, booking: Booking): boolean =>
  start < booking.end && booking.start < end;

export const findConflict = (
  start: number,
  end: number,
  bookings: Booking[]
): Booking | undefined => bookings.find((b) => overlaps(start, end, b));

export const checkBookingRule = (input: CheckInput): Verdict => {
  const { start, end, duration, blocked, now, maxDuration, bookings } = input;

  if (start === null) {
    return {
      kind: 'error',
      message: 'Please enter a valid start time in HH:MM format.',
    };
  }
  if (end === null) {
    return { kind: 'error', message: 'Invalid duration.' };
  }

  // AC1: 0 <= start < end <= 1440, start strictly after NOW
  if (start < 0 || end > 1440 || start >= end) {
    return {
      kind: 'error',
      message:
        'Times must be within the same day (00:00–24:00) with start before end.',
    };
  }
  if (start <= now) {
    return {
      kind: 'error',
      message: `Start time must be strictly after ${toHHMM(now)} (current "now" for this prototype).`,
    };
  }

  // AC2: duration <= maxDuration
  if (duration > maxDuration) {
    return {
      kind: 'error',
      message: `Duration exceeds the ${maxDuration}-minute limit (requested ${duration} min).`,
    };
  }
  if (duration <= 0) {
    return {
      kind: 'error',
      message: 'Duration must be greater than 0 minutes.',
    };
  }

  // AC3: blocked room
  if (blocked) {
    return {
      kind: 'error',
      message: 'This room is currently blocked and cannot be booked.',
    };
  }

  // AC4: overlap check (touching endpoints allowed)
  const conflict = findConflict(start, end, bookings);
  if (conflict) {
    return {
      kind: 'error',
      message: `Overlaps with "${conflict.label}" (${toHHMM(conflict.start)}–${toHHMM(conflict.end)}).`,
    };
  }

  // AC5: available — do NOT mutate bookings
  return { kind: 'ok' };
};
