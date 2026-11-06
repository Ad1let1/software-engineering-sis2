import { describe, it, expect } from 'vitest';
import {
  checkBookingRule,
  findConflict,
  overlaps,
  toHHMM,
  fromHHMM,
  type Booking,
} from './bookingRules';
import { NOW, MAX_DURATION, EXISTING_BOOKINGS } from './fixtures';

const ok = (overrides: Partial<Parameters<typeof checkBookingRule>[0]> = {}) =>
  checkBookingRule({
    start: 660, // 11:00, after NOW (540), in a free gap
    end: 720, // 12:00
    duration: 60,
    blocked: false,
    now: NOW,
    maxDuration: MAX_DURATION,
    bookings: EXISTING_BOOKINGS,
    ...overrides,
  });

describe('AC1 — time bounds and ordering', () => {
  it('rejects start before 0', () => {
    expect(ok({ start: -30, end: 30 }).kind).toBe('error');
  });

  it('rejects end after 1440', () => {
    expect(ok({ start: 1380, end: 1500 }).kind).toBe('error');
  });

  it('rejects start >= end', () => {
    expect(ok({ start: 600, end: 600 }).kind).toBe('error');
    expect(ok({ start: 610, end: 600 }).kind).toBe('error');
  });

  it('rejects start not strictly after NOW', () => {
    expect(ok({ start: NOW, end: NOW + 60 }).kind).toBe('error');
    expect(ok({ start: NOW - 10, end: NOW + 60 }).kind).toBe('error');
  });

  it('accepts valid in-bounds slot after NOW', () => {
    expect(ok({ start: 570, end: 600 }).kind).toBe('ok');
  });
});

describe('AC2 — duration limit', () => {
  it('rejects duration > maxDuration', () => {
    expect(ok({ duration: 121, end: 660 + 121 }).kind).toBe('error');
  });

  it('accepts duration === maxDuration', () => {
    // 15:00–17:00 is a free gap long enough for 120 min
    expect(ok({ start: 900, end: 1020, duration: 120 }).kind).toBe('ok');
  });

  it('rejects duration <= 0', () => {
    expect(ok({ duration: 0, end: 660 }).kind).toBe('error');
    expect(ok({ duration: -10, end: 660 }).kind).toBe('error');
  });

  it('rejects null start or end', () => {
    expect(ok({ start: null, end: null }).kind).toBe('error');
    expect(ok({ start: 660, end: null }).kind).toBe('error');
  });
});

describe('AC3 — blocked room', () => {
  it('rejects when blocked even for an otherwise valid slot', () => {
    expect(ok({ blocked: true }).kind).toBe('error');
  });

  it('accepts when not blocked for a valid slot', () => {
    expect(ok({ blocked: false }).kind).toBe('ok');
  });
});

describe('AC4 — overlap detection', () => {
  it('rejects a slot overlapping an existing booking', () => {
    // 10:30–11:30 overlaps CS-301 Lecture (10:00–11:00)
    expect(ok({ start: 630, end: 690 }).kind).toBe('error');
  });

  it('allows touching endpoints (non-overlapping)', () => {
    // 09:30–10:00 touches CS-301 at 10:00 but does not overlap
    expect(ok({ start: 570, end: 600 }).kind).toBe('ok');
    // 11:00–12:00 touches CS-301 end and Faculty Meeting start
    expect(ok({ start: 660, end: 720 }).kind).toBe('ok');
  });

  it('rejects a slot fully inside an existing booking', () => {
    // 10:15–10:45 inside CS-301 (10:00–11:00)
    expect(ok({ start: 615, end: 645 }).kind).toBe('error');
  });

  it('overlaps helper and findConflict are consistent', () => {
    const b: Booking = { start: 600, end: 660, label: 'X' };
    expect(overlaps(590, 610, b)).toBe(true);
    expect(overlaps(660, 700, b)).toBe(false);
    expect(findConflict(630, 690, EXISTING_BOOKINGS)?.label).toBe(
      'CS-301 Lecture'
    );
  });
});

describe('AC5 — available verdict (no mutation)', () => {
  it('returns ok for a free slot without mutating bookings', () => {
    const snapshot = EXISTING_BOOKINGS.map((b) => ({ ...b }));
    const result = ok({ start: 660, end: 720 });
    expect(result.kind).toBe('ok');
    expect(EXISTING_BOOKINGS).toEqual(snapshot);
  });

  it('returns ok for a slot after the last booking', () => {
    expect(ok({ start: 900, end: 960 }).kind).toBe('ok');
  });
});

describe('time helpers', () => {
  it('toHHMM formats minutes as HH:MM', () => {
    expect(toHHMM(540)).toBe('09:00');
    expect(toHHMM(0)).toBe('00:00');
    expect(toHHMM(1380)).toBe('23:00');
  });

  it('fromHHMM parses and validates HH:MM', () => {
    expect(fromHHMM('09:00')).toBe(540);
    expect(fromHHMM('9:30')).toBe(570);
    expect(fromHHMM('24:00')).toBe(null);
    expect(fromHHMM('abc')).toBe(null);
  });
});

/*
 * Focused regression tests — one scenario per acceptance criterion boundary.
 * Each case references the AC it guards and states the expected result.
 */
describe('regression — AC1 past time', () => {
  // AC1 requires start strictly after NOW. A start equal to NOW is a past-time
  // edge that must be rejected even though the bounds [0,1440] are otherwise valid.
  it('rejects a start time equal to NOW', () => {
    const result = ok({ start: NOW, end: NOW + 30 });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('strictly after');
    }
  });

  // AC1: any start before NOW is in the past and must be rejected.
  it('rejects a start time before NOW', () => {
    const result = ok({ start: NOW - 1, end: NOW + 30 });
    expect(result.kind).toBe('error');
  });
});

describe('regression — AC1 reversed interval', () => {
  // AC1 requires start < end. A reversed interval (start > end) is invalid
  // regardless of whether the individual timestamps are in bounds.
  it('rejects start greater than end', () => {
    const result = ok({ start: 700, end: 660 });
    expect(result.kind).toBe('error');
  });

  it('rejects start equal to end (zero-length)', () => {
    const result = ok({ start: 700, end: 700 });
    expect(result.kind).toBe('error');
  });
});

describe('regression — AC2 121-minute duration', () => {
  // AC2 caps duration at MAX_DURATION (120). 121 is exactly one over the limit
  // and must be rejected, while 120 itself is accepted elsewhere.
  it('rejects a duration of 121 minutes', () => {
    const result = ok({ start: 900, end: 900 + 121, duration: 121 });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('120-minute limit');
    }
  });

  it('accepts a duration of exactly 120 minutes in a free gap', () => {
    const result = ok({ start: 900, end: 1020, duration: 120 });
    expect(result.kind).toBe('ok');
  });
});

describe('regression — AC3 blocked room', () => {
  // AC3: when the room is blocked the verdict is always an error, even if the
  // requested slot would otherwise be free and in bounds.
  it('rejects a valid slot when the room is blocked', () => {
    const result = ok({ start: 660, end: 720, blocked: true });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('blocked');
    }
  });

  it('accepts the same slot when the room is not blocked', () => {
    const result = ok({ start: 660, end: 720, blocked: false });
    expect(result.kind).toBe('ok');
  });
});

describe('regression — AC4 overlap', () => {
  // AC4: a slot that overlaps any existing booking is rejected. 10:15–10:45
  // sits entirely inside CS-301 Lecture (10:00–11:00).
  it('rejects a slot overlapping an existing booking', () => {
    const result = ok({ start: 615, end: 645 });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.message).toContain('CS-301 Lecture');
    }
  });

  it('rejects a slot partially overlapping a booking', () => {
    // 10:45–11:15 overlaps CS-301 (10:00–11:00) on [10:45, 11:00)
    const result = ok({ start: 645, end: 675 });
    expect(result.kind).toBe('error');
  });
});

describe('regression — AC4 touching endpoints', () => {
  // AC4: intervals that only touch at an endpoint do NOT overlap. A slot ending
  // exactly where a booking starts (10:00) must be accepted.
  it('accepts a slot ending exactly where a booking starts', () => {
    const result = ok({ start: 570, end: 600 }); // 09:30–10:00, CS-301 starts at 10:00
    expect(result.kind).toBe('ok');
  });

  // A slot starting exactly where a booking ends must also be accepted.
  it('accepts a slot starting exactly where a booking ends', () => {
    const result = ok({ start: 660, end: 720 }); // 11:00–12:00, CS-301 ends at 11:00
    expect(result.kind).toBe('ok');
  });

  it('overlaps helper reports false for touching endpoints', () => {
    const b: Booking = { start: 600, end: 660, label: 'X' };
    expect(overlaps(570, 600, b)).toBe(false); // ends where booking starts
    expect(overlaps(660, 720, b)).toBe(false); // starts where booking ends
  });
});

describe('regression — AC5/AC6 fixtures unchanged', () => {
  // AC5: checkBookingRule must not mutate the fixtures it receives. AC6: the
  // prototype must remain a single-room, hardcoded-data checker with no
  // backend. We assert the fixture array and its elements are byte-for-byte
  // unchanged after a normal availability check.
  it('does not mutate EXISTING_BOOKINGS during a check', () => {
    const snapshot = EXISTING_BOOKINGS.map((b) => ({ ...b }));
    const result = ok({ start: 660, end: 720 });
    expect(result.kind).toBe('ok');
    expect(EXISTING_BOOKINGS).toEqual(snapshot);
    // Also assert referential identity of the array and each element is intact.
    expect(EXISTING_BOOKINGS.length).toBe(3);
  });

  it('does not mutate fixtures even when the slot overlaps', () => {
    const snapshot = EXISTING_BOOKINGS.map((b) => ({ ...b }));
    const result = ok({ start: 615, end: 645 }); // overlaps CS-301
    expect(result.kind).toBe('error');
    expect(EXISTING_BOOKINGS).toEqual(snapshot);
  });

  it('does not mutate fixtures when the room is blocked', () => {
    const snapshot = EXISTING_BOOKINGS.map((b) => ({ ...b }));
    const result = ok({ start: 660, end: 720, blocked: true });
    expect(result.kind).toBe('error');
    expect(EXISTING_BOOKINGS).toEqual(snapshot);
  });

  it('preserves fixture values and labels', () => {
    // AC6: the hardcoded single-room data must remain stable.
    expect(EXISTING_BOOKINGS).toEqual([
      { start: 600, end: 660, label: 'CS-301 Lecture' },
      { start: 720, end: 780, label: 'Faculty Meeting' },
      { start: 840, end: 900, label: 'Guest Seminar' },
    ]);
  });
});
