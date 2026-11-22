import { describe, expect, it } from "vitest";
import type { FamilyEvent } from "../../types/notes";
import type { SleepSession } from "../../types/sleep";
import {
  getTodaySleepDuration,
  getWeeklySleepSummary,
  mapSleepEventsToSessions,
} from "./sleepUtils";

const referenceDate = new Date("2026-11-23T12:00:00+05:30");

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
    content: "Baby slept",
    category: "Sleep",
    eventDate: "2026-11-22",
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

  it("keeps active sessions without an end time", () => {
    const result = mapSleepEventsToSessions([createEvent({ endTime: null })]);

    expect(result[0]?.endTime).toBeNull();
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
  it("splits overnight sleep across two calendar days", () => {
    const sessions = [
      createSession("2026-11-22T23:00:00+05:30", "2026-11-23T01:00:00+05:30"),
    ];

    const result = getWeeklySleepSummary(sessions, referenceDate);

    expect(result.weeklyTotal).toBe(120);
    expect(result.days[5]?.totalMinutes).toBe(60);
    expect(result.days[6]?.totalMinutes).toBe(60);
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
