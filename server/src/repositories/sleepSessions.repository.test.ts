import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  insert: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  is: vi.fn(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
  results: [] as unknown[],
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: mocks.from,
  },
}));

import {
  completeTrackerSleepSession,
  createTrackerSleepSession,
} from "./sleepSessions.repository";

const queryBuilder = {
  insert: mocks.insert,
  select: mocks.select,
  update: mocks.update,
  eq: mocks.eq,
  is: mocks.is,
  single: mocks.single,
  maybeSingle: mocks.maybeSingle,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.results = [];
  mocks.from.mockReturnValue(queryBuilder);
  mocks.insert.mockReturnValue(queryBuilder);
  mocks.select.mockReturnValue(queryBuilder);
  mocks.update.mockReturnValue(queryBuilder);
  mocks.eq.mockReturnValue(queryBuilder);
  mocks.is.mockReturnValue(queryBuilder);
  mocks.single.mockImplementation(() =>
    Promise.resolve(mocks.results.shift()),
  );
  mocks.maybeSingle.mockImplementation(() =>
    Promise.resolve(mocks.results.shift()),
  );
  vi.stubEnv("BABYOS_DEV_FAMILY_ID", "family-1");
  vi.stubEnv("BABYOS_DEV_BABY_ID", "baby-1");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("createTrackerSleepSession", () => {
  it("sets the tracker marker and calculates completed duration on the server", async () => {
    mocks.results.push({ data: { id: "session-1" }, error: null });

    await expect(
      createTrackerSleepSession({
        startTime: new Date("2026-11-23T07:30:00.000Z"),
        endTime: new Date("2026-11-23T08:30:00.000Z"),
      }),
    ).resolves.toEqual({ id: "session-1" });

    expect(mocks.from).toHaveBeenCalledWith("baby_events");
    expect(mocks.insert).toHaveBeenCalledWith({
      family_id: "family-1",
      baby_id: "baby-1",
      source_note_id: null,
      content: "Sleep session",
      category: "Sleep",
      event_date: "2026-11-23",
      end_date: "2026-11-23",
      start_time: "13:00:00",
      end_time: "14:00:00",
      quantity: null,
      unit: null,
      duration_minutes: 60,
      is_tracker_session: true,
    });
  });

  it("stores active sessions with a null end and duration", async () => {
    mocks.results.push({ data: { id: "session-2" }, error: null });

    await createTrackerSleepSession({
      startTime: new Date("2026-11-23T07:30:00.000Z"),
      endTime: null,
    });

    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        end_time: null,
        end_date: null,
        duration_minutes: null,
        is_tracker_session: true,
      }),
    );
  });

  it("stores actual IST dates for sessions spanning multiple days", async () => {
    mocks.results.push({ data: { id: "session-multi-day" }, error: null });

    await createTrackerSleepSession({
      startTime: new Date("2026-11-23T18:45:00.000Z"),
      endTime: new Date("2026-11-25T19:00:00.000Z"),
    });

    expect(mocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_date: "2026-11-24",
        end_date: "2026-11-26",
        start_time: "00:15:00",
        end_time: "00:30:00",
        duration_minutes: 2895,
      }),
    );
  });

  it("rejects an end time that is not after start", async () => {
    await expect(
      createTrackerSleepSession({
        startTime: new Date("2026-11-23T07:30:00.000Z"),
        endTime: new Date("2026-11-23T07:29:00.000Z"),
      }),
    ).rejects.toThrow("Sleep end time must be after start time.");

    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe("completeTrackerSleepSession", () => {
  it("only completes a marked open session and uses a conditional update", async () => {
    mocks.results.push(
      {
        data: {
          id: "session-1",
          event_date: "2026-11-23",
          start_time: "13:00:00",
        },
        error: null,
      },
      { data: { id: "session-1" }, error: null },
    );

    await expect(
      completeTrackerSleepSession(
        "session-1",
        new Date("2026-11-23T08:30:00.000Z"),
      ),
    ).resolves.toEqual({ status: "completed" });

    expect(mocks.select).toHaveBeenCalledWith("id, event_date, start_time");
    expect(mocks.update).toHaveBeenCalledWith({
      end_time: "14:00:00",
      end_date: "2026-11-23",
      duration_minutes: 60,
    });
    expect(mocks.eq).toHaveBeenCalledWith("is_tracker_session", true);
    expect(mocks.eq).toHaveBeenCalledWith("family_id", "family-1");
    expect(mocks.eq).toHaveBeenCalledWith("baby_id", "baby-1");
    expect(mocks.is).toHaveBeenCalledWith("end_time", null);
    expect(mocks.maybeSingle).toHaveBeenCalledTimes(2);
  });

  it("completes an overnight session with the next IST calendar date", async () => {
    mocks.results.push(
      {
        data: {
          id: "session-overnight",
          event_date: "2026-11-23",
          start_time: "23:00:00",
        },
        error: null,
      },
      { data: { id: "session-overnight" }, error: null },
    );

    await expect(
      completeTrackerSleepSession(
        "session-overnight",
        new Date("2026-11-23T20:15:00.000Z"),
      ),
    ).resolves.toEqual({ status: "completed" });

    expect(mocks.update).toHaveBeenCalledWith({
      end_date: "2026-11-24",
      end_time: "01:45:00",
      duration_minutes: 165,
    });
  });

  it("does not update a session if its end time is not after its start", async () => {
    mocks.results.push({
      data: {
        id: "session-1",
        event_date: "2026-11-23",
        start_time: "13:00:00",
      },
      error: null,
    });

    await expect(
      completeTrackerSleepSession(
        "session-1",
        new Date("2026-11-23T07:29:00.000Z"),
      ),
    ).resolves.toEqual({ status: "invalid-end-time" });

    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("returns not found for an ordinary or missing event", async () => {
    mocks.results.push({ data: null, error: null });

    await expect(
      completeTrackerSleepSession(
        "ordinary-event",
        new Date("2026-11-23T08:30:00.000Z"),
      ),
    ).resolves.toEqual({ status: "not-found" });

    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("returns conflict if another completion won the conditional update", async () => {
    mocks.results.push(
      {
        data: {
          id: "session-1",
          event_date: "2026-11-23",
          start_time: "13:00:00",
        },
        error: null,
      },
      { data: null, error: null },
    );

    await expect(
      completeTrackerSleepSession(
        "session-1",
        new Date("2026-11-23T08:30:00.000Z"),
      ),
    ).resolves.toEqual({ status: "conflict" });
  });
});
