import type { FamilyEvent } from "../../types/notes";
import type { SleepSession } from "../../types/sleep";

const IST_OFFSET = "+05:30";
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const MINUTE_IN_MILLISECONDS = 60 * 1000;
const MAX_DURATION_MINUTES = 2_147_483_647;

type PastSleepIntervalResult =
  | { ok: true; startTime: string; endTime: string }
  | { ok: false; error: string };

export function createPastSleepInterval(
  startValue: string,
  hoursValue: string,
  minutesValue: string,
  now: Date = new Date(),
): PastSleepIntervalResult {
  if (!startValue || hoursValue === "") {
    return {
      ok: false,
      error: "Please enter the sleep start time and duration.",
    };
  }

  const startDate = new Date(startValue);
  const hours = Number(hoursValue);
  const minutes = Number(minutesValue || 0);

  if (
    Number.isNaN(startDate.getTime()) ||
    !Number.isSafeInteger(hours) ||
    !Number.isSafeInteger(minutes) ||
    hours < 0 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return { ok: false, error: "Please enter valid sleep details." };
  }

  const totalMinutes = hours * 60 + minutes;

  if (
    !Number.isSafeInteger(totalMinutes) ||
    totalMinutes > MAX_DURATION_MINUTES
  ) {
    return { ok: false, error: "Please enter valid sleep details." };
  }

  if (totalMinutes <= 0) {
    return { ok: false, error: "Sleep duration must be greater than zero." };
  }

  if (startDate > now) {
    return { ok: false, error: "Sleep start time cannot be in the future." };
  }

  const endDate = new Date(
    startDate.getTime() + totalMinutes * MINUTE_IN_MILLISECONDS,
  );

  if (Number.isNaN(endDate.getTime())) {
    return { ok: false, error: "Please enter valid sleep details." };
  }

  if (endDate > now) {
    return {
      ok: false,
      error: "Calculated wake-up time cannot be in the future.",
    };
  }

  return {
    ok: true,
    startTime: startDate.toISOString(),
    endTime: endDate.toISOString(),
  };
}

function getIstDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getIstDayStart(date: Date): number {
  return new Date(`${getIstDateString(date)}T00:00:00${IST_OFFSET}`).getTime();
}

function getSessionOverlap(
  session: SleepSession,
  dayStart: number,
  dayEnd: number,
): number {
  if (!session.endTime) return 0;

  const sessionStart = new Date(session.startTime).getTime();
  const sessionEnd = new Date(session.endTime).getTime();

  if (
    Number.isNaN(sessionStart) ||
    Number.isNaN(sessionEnd) ||
    sessionEnd <= sessionStart
  ) {
    return 0;
  }

  const overlapStart = Math.max(sessionStart, dayStart);
  const overlapEnd = Math.min(sessionEnd, dayEnd);

  return Math.max(0, overlapEnd - overlapStart);
}

export function getTodaySleepDuration(
  sessions: SleepSession[],
  referenceDate: Date = new Date(),
): number {
  const todayStart = getIstDayStart(referenceDate);
  const todayEnd = todayStart + DAY_IN_MILLISECONDS;

  const totalMilliseconds = sessions.reduce(
    (total, session) =>
      total + getSessionOverlap(session, todayStart, todayEnd),
    0,
  );

  return Math.floor(totalMilliseconds / 60000);
}

export function mapSleepEventsToSessions(
  events: FamilyEvent[],
): SleepSession[] {
  return events.flatMap((event) => {
    if (event.category !== "Sleep" || !event.eventDate || !event.startTime) {
      return [];
    }

    // Completed Sleep events from Quick Capture remain part of history and summaries.
    // Only a marked tracker event may represent an open session.
    if (!event.endTime && !event.isTrackerSession) return [];

    const startTime = new Date(
      `${event.eventDate}T${event.startTime}${IST_OFFSET}`,
    );

    if (Number.isNaN(startTime.getTime())) return [];

    let endTime: string | null = null;

    if (event.endTime) {
      const endDate = new Date(
        `${event.endDate ?? event.eventDate}T${event.endTime}${IST_OFFSET}`,
      );

      if (Number.isNaN(endDate.getTime())) return [];

      // Older/ordinary events have no explicit end date; preserve their legacy
      // interpretation of an earlier end clock time as the following day.
      if (!event.endDate && endDate < startTime) {
        endDate.setTime(endDate.getTime() + DAY_IN_MILLISECONDS);
      }

      endTime = endDate.toISOString();
    }

    return [
      {
        id: event.id,
        startTime: startTime.toISOString(),
        endTime,
      },
    ];
  });
}

export function getWeeklySleepSummary(
  sessions: SleepSession[],
  referenceDate: Date = new Date(),
) {
  const todayStart = getIstDayStart(referenceDate);

  const dayMilliseconds = Array.from({ length: 7 }, (_, index) => {
    const dayStart = todayStart - (6 - index) * DAY_IN_MILLISECONDS;
    const dayEnd = dayStart + DAY_IN_MILLISECONDS;

    return sessions.reduce(
      (total, session) => total + getSessionOverlap(session, dayStart, dayEnd),
      0,
    );
  });

  // Floor the full reporting-window duration once, then allocate any remaining
  // whole minutes to the days with the largest fractional remainders. Ties go
  // to the earlier day, keeping daily totals additive to the weekly total.
  const weeklyTotal = Math.floor(
    dayMilliseconds.reduce((total, value) => total + value, 0) /
      MINUTE_IN_MILLISECONDS,
  );
  const allocatedMinutes = dayMilliseconds.map((value) =>
    Math.floor(value / MINUTE_IN_MILLISECONDS),
  );
  let unallocatedMinutes =
    weeklyTotal - allocatedMinutes.reduce((total, value) => total + value, 0);
  const allocationOrder = dayMilliseconds
    .map((value, index) => ({
      index,
      remainder: value % MINUTE_IN_MILLISECONDS,
    }))
    .sort(
      (left, right) =>
        right.remainder - left.remainder || left.index - right.index,
    );

  for (const { index } of allocationOrder) {
    if (unallocatedMinutes <= 0) break;
    allocatedMinutes[index] = (allocatedMinutes[index] ?? 0) + 1;
    unallocatedMinutes -= 1;
  }

  const days = dayMilliseconds.map((_, index) => {
    const dayStart = todayStart - (6 - index) * DAY_IN_MILLISECONDS;

    return {
      label: new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
      }).format(new Date(dayStart)),

      dateLabel: new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
      }).format(new Date(dayStart)),

      isToday: index === 6,
      totalMinutes: allocatedMinutes[index] ?? 0,
    };
  });

  return {
    days,
    weeklyTotal,
    dailyAverage: Math.floor(weeklyTotal / 7),
  };
}
