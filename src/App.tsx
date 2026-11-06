import { useMemo, useState } from 'react';
import {
  DoorOpen,
  Clock,
  CalendarCheck,
  RotateCcw,
  Info,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  checkBookingRule,
  fromHHMM,
  toHHMM,
  findConflict,
  type Verdict,
} from '@/bookingRules';
import {
  NOW,
  MAX_DURATION,
  ROOM_NAME,
  ROOM_CAPACITY,
  EXISTING_BOOKINGS,
} from '@/fixtures';

export default function App() {
  const [startTime, setStartTime] = useState('09:30');
  const [duration, setDuration] = useState(60);
  const [blocked, setBlocked] = useState(false);
  const [verdict, setVerdict] = useState<Verdict>({ kind: 'idle' });

  const computedStart = useMemo(() => fromHHMM(startTime), [startTime]);
  const computedEnd = useMemo(
    () => (computedStart === null ? null : computedStart + duration),
    [computedStart, duration]
  );

  const scheduleBlocks = useMemo(() => {
    const total = 1440;
    const segments: {
      type: 'booked' | 'free';
      start: number;
      end: number;
    }[] = [];
    const sorted = [...EXISTING_BOOKINGS].sort((a, b) => a.start - b.start);
    let cursor = 0;
    for (const b of sorted) {
      if (b.start > cursor) {
        segments.push({ type: 'free', start: cursor, end: b.start });
      }
      segments.push({ type: 'booked', start: b.start, end: b.end });
      cursor = Math.max(cursor, b.end);
    }
    if (cursor < total) {
      segments.push({ type: 'free', start: cursor, end: total });
    }
    return segments;
  }, []);

  const preview = useMemo(() => {
    if (computedStart === null || computedEnd === null) return null;
    const conflict = findConflict(computedStart, computedEnd, EXISTING_BOOKINGS);
    return { overlap: conflict };
  }, [computedStart, computedEnd]);

  const checkAvailability = () => {
    setVerdict(
      checkBookingRule({
        start: computedStart,
        end: computedEnd,
        duration,
        blocked,
        now: NOW,
        maxDuration: MAX_DURATION,
        bookings: EXISTING_BOOKINGS,
      })
    );
  };

  const reset = () => {
    setStartTime('09:30');
    setDuration(60);
    setBlocked(false);
    setVerdict({ kind: 'idle' });
  };

  const liveStartInvalid = computedStart === null;
  const liveEndLabel =
    computedStart !== null && duration > 0
      ? toHHMM(computedStart + duration)
      : '—';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-white">
            <DoorOpen className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-base font-semibold leading-tight">
              Smart Campus Room Availability Checker
            </h1>
            <p className="text-xs text-slate-500">
              Availability only — no bookings are created or saved
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        {/* Room card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{ROOM_NAME}</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Capacity {ROOM_CAPACITY} · Today · Prototype demo
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Single room
            </span>
          </div>

          {/* Block toggle (AC3) */}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              {blocked ? (
                <Lock className="h-4 w-4 text-rose-600" />
              ) : (
                <Unlock className="h-4 w-4 text-emerald-600" />
              )}
              <div>
                <p className="text-sm font-medium">Room status</p>
                <p className="text-xs text-slate-500">
                  Simulate the room being blocked by maintenance
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={blocked}
              onClick={() => {
                setBlocked((b) => !b);
                setVerdict({ kind: 'idle' });
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                blocked ? 'bg-rose-600' : 'bg-emerald-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  blocked ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Form + result */}
        <section className="mt-5 grid gap-5 lg:grid-cols-5">
          {/* Input form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3">
            <h3 className="text-sm font-semibold text-slate-700">
              Check a time slot
            </h3>

            <div className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="start"
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-600"
                >
                  <Clock className="h-3.5 w-3.5" /> Start time (HH:MM)
                </label>
                <input
                  id="start"
                  type="text"
                  inputMode="numeric"
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setVerdict({ kind: 'idle' });
                  }}
                  placeholder="09:30"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Must be strictly after {toHHMM(NOW)} (hardcoded "now").
                </p>
              </div>

              <div>
                <label
                  htmlFor="duration"
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-600"
                >
                  <Clock className="h-3.5 w-3.5" /> Duration (minutes)
                </label>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    id="duration"
                    type="range"
                    min={15}
                    max={180}
                    step={15}
                    value={Math.min(duration, 180)}
                    onChange={(e) => {
                      setDuration(Number(e.target.value));
                      setVerdict({ kind: 'idle' });
                    }}
                    className="flex-1 accent-sky-600"
                  />
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={duration}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setDuration(Number.isFinite(v) ? v : 0);
                      setVerdict({ kind: 'idle' });
                    }}
                    className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Maximum 120 minutes (exactly 120 is allowed).
                </p>
              </div>

              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Start</span>
                  <span className="font-medium">
                    {liveStartInvalid ? '—' : toHHMM(computedStart ?? 0)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-slate-500">End</span>
                  <span className="font-medium">{liveEndLabel}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={checkAvailability}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 active:scale-[0.99]"
              >
                <CalendarCheck className="h-4 w-4" /> Check availability
              </button>
              <button
                type="button"
                onClick={reset}
                className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            </div>
          </div>

          {/* Result panel (AC5) */}
          <div className="lg:col-span-2">
            <ResultPanel verdict={verdict} blocked={blocked} />
          </div>
        </section>

        {/* Timeline + existing bookings */}
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">
              Today’s schedule for this room
            </h3>
            <span className="text-xs text-slate-500">
              Existing bookings (read-only)
            </span>
          </div>

          {/* Timeline bar */}
          <div className="mt-4">
            <div className="relative h-8 w-full overflow-hidden rounded-md border border-slate-200">
              {scheduleBlocks.map((seg, i) => {
                const left = (seg.start / 1440) * 100;
                const width = ((seg.end - seg.start) / 1440) * 100;
                return (
                  <div
                    key={i}
                    className={`absolute top-0 h-full ${
                      seg.type === 'booked'
                        ? 'bg-slate-300'
                        : 'bg-emerald-100'
                    }`}
                    style={{ left: `${left}%`, width: `${width}%` }}
                    title={`${toHHMM(seg.start)}–${toHHMM(seg.end)}`}
                  />
                );
              })}
              {/* Now marker */}
              <div
                className="absolute top-0 z-10 h-full w-px bg-rose-500"
                style={{ left: `${(NOW / 1440) * 100}%` }}
                title={`Now: ${toHHMM(NOW)}`}
              />
              {/* Preview marker */}
              {computedStart !== null &&
                computedEnd !== null &&
                computedStart >= 0 &&
                computedEnd <= 1440 &&
                computedStart < computedEnd && (
                  <div
                    className={`absolute top-0 h-full border-x-2 ${
                      preview?.overlap
                        ? 'border-rose-500 bg-rose-300/60'
                        : 'border-sky-500 bg-sky-300/60'
                    }`}
                    style={{
                      left: `${(computedStart / 1440) * 100}%`,
                      width: `${((computedEnd - computedStart) / 1440) * 100}%`,
                    }}
                  />
                )}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-slate-400">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>24:00</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-emerald-100" /> Free
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-slate-300" /> Booked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-sm bg-sky-300/60 border-x-2 border-sky-500" />{' '}
                Your slot
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-px bg-rose-500" /> Now
              </span>
            </div>
          </div>

          {/* Existing bookings list */}
          <ul className="mt-4 space-y-2">
            {EXISTING_BOOKINGS.map((b) => (
              <li
                key={`${b.start}-${b.end}`}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-700">{b.label}</span>
                <span className="tabular-nums text-slate-500">
                  {toHHMM(b.start)}–{toHHMM(b.end)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-400">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Slots that only touch at an endpoint (e.g. 10:00–11:00 then
            11:00–12:00) are considered non-overlapping.
          </p>
        </section>

        <footer className="mt-6 px-1 text-center text-xs text-slate-400">
          Prototype · Hardcoded data · No bookings are stored.
        </footer>
      </main>
    </div>
  );
}

function ResultPanel({
  verdict,
  blocked,
}: {
  verdict: Verdict;
  blocked: boolean;
}) {
  if (verdict.kind === 'idle') {
    return (
      <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <Info className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm font-medium text-slate-600">
          Pick a start time and duration, then check availability.
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {blocked
            ? 'The room is currently marked as blocked.'
            : 'The room is currently marked as available.'}
        </p>
      </div>
    );
  }

  if (verdict.kind === 'ok') {
    return (
      <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <p className="mt-3 text-base font-semibold text-emerald-800">
          Available
        </p>
        <p className="mt-1 text-xs text-emerald-700">
          This slot is free and the room is not blocked.
        </p>
      </div>
    );
  }

  // error
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-600 text-white">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <p className="mt-3 text-base font-semibold text-rose-800">Unavailable</p>
      <p className="mt-1 text-xs text-rose-700">{verdict.message}</p>
    </div>
  );
}
