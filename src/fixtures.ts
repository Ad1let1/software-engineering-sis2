import type { Booking } from './bookingRules';

export const NOW = 540; // 09:00 AM, hardcoded per AC1
export const MAX_DURATION = 120; // minutes, AC2
export const ROOM_NAME = 'Engineering Hall · Room 204';
export const ROOM_CAPACITY = 40;

// Hardcoded existing bookings (AC4). Intervals touching at endpoints do NOT overlap.
export const EXISTING_BOOKINGS: Booking[] = [
  { start: 600, end: 660, label: 'CS-301 Lecture' }, // 10:00 - 11:00
  { start: 720, end: 780, label: 'Faculty Meeting' }, // 12:00 - 13:00
  { start: 840, end: 900, label: 'Guest Seminar' }, // 14:00 - 15:00
];
