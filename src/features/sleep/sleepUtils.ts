import type { FamilyEvent } from "../../types/notes";
import type { SleepSession } from "../../types/sleep";

const IST_OFFSET = "+05:30";
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

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

    const startTime = new Date(
      `${event.eventDate}T${event.startTime}${IST_OFFSET}`,
    );

    if (Number.isNaN(startTime.getTime())) return [];

    let endTime: string | null = null;

    if (event.endTime) {
      const endDate = new Date(
        `${event.eventDate}T${event.endTime}${IST_OFFSET}`,
      );

      if (Number.isNaN(endDate.getTime())) return [];

      // An earlier end time means the session continued into the next day.
      if (endDate < startTime) {
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

  const days = Array.from({ length: 7 }, (_, index) => {
    const dayStart = todayStart - (6 - index) * DAY_IN_MILLISECONDS;
    const dayEnd = dayStart + DAY_IN_MILLISECONDS;

    const totalMilliseconds = sessions.reduce(
      (total, session) => total + getSessionOverlap(session, dayStart, dayEnd),
      0,
    );

    return {
      label: new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short",
      }).format(new Date(dayStart)),
      totalMinutes: Math.floor(totalMilliseconds / 60000),
    };
  });

  const weeklyTotal = days.reduce((total, day) => total + day.totalMinutes, 0);

  return {
    days,
    weeklyTotal,
    dailyAverage: Math.floor(weeklyTotal / 7),
  };
}
