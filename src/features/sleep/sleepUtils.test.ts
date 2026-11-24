import { describe, expect, it } from "vitest";
import type { FamilyEvent } from "../../types/notes";
import type { SleepSession } from "../../types/sleep";
import {
  createPastSleepInterval,
  getTodaySleepDuration,
  getWeeklySleepSummary,
  mapSleepEventsToSessions,
} from "./sleepUtils";

const referenceDate = new Date("2026-11-23T12:00:00+05:30");

describe("createPastSleepInterval", () => {
  const now = new Date("2026-11-25T12:00:00+05:30");

  it.each([
    ["2", "15", 135],
    ["24", "0", 1440],
    ["30", "45", 1845],
  ])(
    "creates a valid interval for %s hours and %s minutes",
    (hours, minutes, duration) => {
      const interval = createPastSleepInterval(
        "2026-11-23T10:00",
        hours,
        minutes,
        now,
      );

      expect(interval.ok).toBe(true);
      if (interval.ok) {
        expect(
          new Date(interval.endTime).getTime() -
            new Date(interval.startTime).getTime(),
        ).toBe(duration * 60_000);
      }
    },
  );

  it.each([
    ["-1", "0"],
    ["1.5", "0"],
    ["1", "60"],
    ["0", "0"],
  ])(
    "rejects invalid duration values %s hours and %s minutes",
    (hours, minutes) => {
      expect(
        createPastSleepInterval("2026-11-23T10:00", hours, minutes, now).ok,
      ).toBe(false);
    },
  );

  it("preserves future start and wake-time validation", () => {
    expect(
      createPastSleepInterval("2026-11-26T10:00", "1", "0", now),
    ).toEqual({ ok: false, error: "Sleep start time cannot be in the future." });
    expect(
      createPastSleepInterval("2026-11-25T11:30", "1", "0", now),
    ).toEqual({
      ok: false,
      error: "Calculated wake-up time cannot be in the future.",
    });
  });
});

function createSession(
  startTime: string,
  endTime: string | null,
): SleepSession {
  return {
    id: crypto.randomUUID(),
    startTime,
    endTime,
  };
}

function createEvent(overrides: Partial<FamilyEvent> = {}): FamilyEvent {
  return {
    id: "event-1",
    sourceNoteId: "note-1",
    isTrackerSession: false,
    content: "Baby slept",
    category: "Sleep",
    eventDate: "2026-11-22",
    endDate: null,
    startTime: "23:00",
    endTime: "01:00",
    quantity: null,
    unit: null,
    durationMinutes: null,
    recordedAt: "2026-11-22T23:00:00+05:30",
    createdAt: "2026-11-22T23:00:00+05:30",
    ...overrides,
  };
}

describe("mapSleepEventsToSessions", () => {
  it("maps an overnight sleep event correctly", () => {
    const result = mapSleepEventsToSessions([createEvent()]);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "event-1",
      startTime: "2026-11-22T17:30:00.000Z",
      endTime: "2026-11-22T19:30:00.000Z",
    });
  });

  it("uses the explicit end date for an overnight tracker session", () => {
    const [session] = mapSleepEventsToSessions([
      createEvent({
        isTrackerSession: true,
        eventDate: "2026-11-22",
        startTime: "23:00",
        endDate: "2026-11-23",
        endTime: "01:00",
      }),
    ]);

    expect(session).toEqual({
      id: "event-1",
      startTime: "2026-11-22T17:30:00.000Z",
      endTime: "2026-11-22T19:30:00.000Z",
    });
  });

  it("maps an exactly 24-hour session using its explicit end date", () => {
    const [session] = mapSleepEventsToSessions([
      createEvent({
        isTrackerSession: true,
        eventDate: "2026-11-21",
        startTime: "23:00",
        endDate: "2026-11-22",
        endTime: "23:00",
      }),
    ]);

    expect(session?.endTime).toBe("2026-11-22T17:30:00.000Z");
    expect(
      getWeeklySleepSummary([session!], referenceDate).weeklyTotal,
    ).toBe(1440);
  });

  it("maps sessions longer than 24 hours without truncating their duration", () => {
    const [session] = mapSleepEventsToSessions([
      createEvent({
        isTrackerSession: true,
        eventDate: "2026-11-21",
        startTime: "23:00",
        endDate: "2026-11-23",
        endTime: "01:00",
      }),
    ]);

    const summary = getWeeklySleepSummary([session!], referenceDate);

    expect(summary.days[4]?.totalMinutes).toBe(60);
    expect(summary.days[5]?.totalMinutes).toBe(1440);
    expect(summary.days[6]?.totalMinutes).toBe(60);
    expect(summary.weeklyTotal).toBe(1560);
  });

  it("maps sessions spanning multiple calendar days from stored dates", () => {
    const [session] = mapSleepEventsToSessions([
      createEvent({
        isTrackerSession: true,
        eventDate: "2026-11-21",
        startTime: "23:00",
        endDate: "2026-11-23",
        endTime: "23:00",
      }),
    ]);

    const summary = getWeeklySleepSummary([session!], referenceDate);

    expect(summary.days[4]?.totalMinutes).toBe(60);
    expect(summary.days[5]?.totalMinutes).toBe(1440);
    expect(summary.days[6]?.totalMinutes).toBe(1380);
    expect(summary.weeklyTotal).toBe(2880);
  });

  it("restores marked tracker sessions without an end time", () => {
    const result = mapSleepEventsToSessions([
      createEvent({ isTrackerSession: true, endTime: null }),
    ]);

    expect(result[0]?.endTime).toBeNull();
  });

  it("does not treat an ordinary open Sleep event as a tracker session", () => {
    const result = mapSleepEventsToSessions([
      createEvent({ isTrackerSession: false, endTime: null }),
    ]);

    expect(result).toEqual([]);
  });

  it("keeps completed Sleep events from either source in history", () => {
    const ordinary = createEvent({
      isTrackerSession: false,
      endTime: "01:00",
    });
    const tracked = createEvent({
      id: "event-2",
      isTrackerSession: true,
      endTime: "01:00",
    });

    expect(mapSleepEventsToSessions([ordinary, tracked])).toHaveLength(2);
  });

  it("ignores non-sleep events", () => {
    const result = mapSleepEventsToSessions([
      createEvent({ category: "Feeding" }),
    ]);

    expect(result).toEqual([]);
  });

  it("ignores events with missing or invalid dates", () => {
    const result = mapSleepEventsToSessions([
      createEvent({ eventDate: null }),
      createEvent({ id: "event-2", eventDate: "invalid-date" }),
      createEvent({ id: "event-3", endTime: "invalid-time" }),
      createEvent({ id: "event-4", startTime: null }),
    ]);

    expect(result).toEqual([]);
  });

  it("does not treat equal start and end times as an overnight session", () => {
    const result = mapSleepEventsToSessions([
      createEvent({
        startTime: "08:00",
        endTime: "08:00",
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.startTime).toBe(result[0]?.endTime);
  });
});

describe("getTodaySleepDuration", () => {
  it("calculates completed sleep within today", () => {
    const sessions = [
      createSession("2026-11-23T01:00:00+05:30", "2026-11-23T03:00:00+05:30"),
    ];

    expect(getTodaySleepDuration(sessions, referenceDate)).toBe(120);
  });

  it("counts only the portion of an overnight session that falls today", () => {
    const sessions = [
      createSession("2026-11-22T23:00:00+05:30", "2026-11-23T02:00:00+05:30"),
    ];

    expect(getTodaySleepDuration(sessions, referenceDate)).toBe(120);
  });

  it("excludes active sessions", () => {
    const sessions = [createSession("2026-11-23T01:00:00+05:30", null)];

    expect(getTodaySleepDuration(sessions, referenceDate)).toBe(0);
  });

  it("ignores invalid and zero-duration sessions", () => {
    const sessions = [
      createSession("invalid", "2026-11-23T02:00:00+05:30"),
      createSession("2026-11-23T02:00:00+05:30", "2026-11-23T02:00:00+05:30"),
    ];

    expect(getTodaySleepDuration(sessions, referenceDate)).toBe(0);
  });

  it("adds multiple completed sessions on the same day", () => {
    const sessions = [
      createSession("2026-11-23T01:00:00+05:30", "2026-11-23T03:00:00+05:30"),
      createSession("2026-11-23T14:00:00+05:30", "2026-11-23T15:30:00+05:30"),
    ];

    expect(getTodaySleepDuration(sessions, referenceDate)).toBe(210);
  });

  it("floors the combined duration to whole minutes", () => {
    const sessions = [
      createSession("2026-11-23T01:00:00+05:30", "2026-11-23T01:00:30+05:30"),
      createSession("2026-11-23T02:00:00+05:30", "2026-11-23T02:00:30+05:30"),
    ];

    expect(getTodaySleepDuration(sessions, referenceDate)).toBe(1);
  });
});

describe("getWeeklySleepSummary", () => {
  it("includes completed Sleep events from both origins", () => {
    const sessions = mapSleepEventsToSessions([
      createEvent({ isTrackerSession: false }),
      createEvent({ id: "event-2", isTrackerSession: true }),
    ]);

    const result = getWeeklySleepSummary(sessions, referenceDate);

    expect(sessions).toHaveLength(2);
    expect(result.weeklyTotal).toBe(240);
  });

  it("splits overnight sleep across two calendar days", () => {
    const sessions = [
      createSession("2026-11-22T23:00:00+05:30", "2026-11-23T01:00:00+05:30"),
    ];

    const result = getWeeklySleepSummary(sessions, referenceDate);

    expect(result.weeklyTotal).toBe(120);
    expect(result.days[5]?.totalMinutes).toBe(60);
    expect(result.days[6]?.totalMinutes).toBe(60);
  });

  it("allocates a 60-second midnight session without losing a minute", () => {
    const sessions = [
      createSession("2026-11-22T23:59:30+05:30", "2026-11-23T00:00:30+05:30"),
    ];

    const result = getWeeklySleepSummary(sessions, referenceDate);

    expect(result.days[5]?.totalMinutes).toBe(1);
    expect(result.days[6]?.totalMinutes).toBe(0);
    expect(result.days.reduce((total, day) => total + day.totalMinutes, 0)).toBe(
      result.weeklyTotal,
    );
    expect(result.weeklyTotal).toBe(1);
  });

  it("excludes active sessions from the weekly summary", () => {
    const sessions = [createSession("2026-11-23T01:00:00+05:30", null)];

    const result = getWeeklySleepSummary(sessions, referenceDate);

    expect(result.weeklyTotal).toBe(0);
    expect(result.dailyAverage).toBe(0);
  });

  it("returns seven days and calculates the daily average", () => {
    const sessions = [
      createSession("2026-11-23T01:00:00+05:30", "2026-11-23T03:00:00+05:30"),
    ];

    const result = getWeeklySleepSummary(sessions, referenceDate);

    expect(result.days).toHaveLength(7);
    expect(result.weeklyTotal).toBe(120);
    expect(result.dailyAverage).toBe(17);
  });

  it("splits a multi-day session across calendar days", () => {
    const sessions = [
      createSession("2026-11-21T23:00:00+05:30", "2026-11-23T01:00:00+05:30"),
    ];

    const result = getWeeklySleepSummary(sessions, referenceDate);

    expect(result.days[4]?.totalMinutes).toBe(60);
    expect(result.days[5]?.totalMinutes).toBe(1440);
    expect(result.days[6]?.totalMinutes).toBe(60);
    expect(result.weeklyTotal).toBe(1560);
  });

  it("excludes sessions outside the seven-day reporting window", () => {
    const sessions = [
      createSession("2026-11-16T01:00:00+05:30", "2026-11-16T03:00:00+05:30"),
    ];

    const result = getWeeklySleepSummary(sessions, referenceDate);

    expect(result.weeklyTotal).toBe(0);
    expect(result.dailyAverage).toBe(0);
  });
});
