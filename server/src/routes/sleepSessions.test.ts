const { completeTrackerSleepSession, createTrackerSleepSession } =
  vi.hoisted(() => ({
    completeTrackerSleepSession: vi.fn(),
    createTrackerSleepSession: vi.fn(),
  }));

vi.mock("../repositories/sleepSessions.repository", () => ({
  completeTrackerSleepSession,
  createTrackerSleepSession,
}));

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import sleepSessions from "./sleepSessions";

const app = new Hono().route("/api/sleep-sessions", sleepSessions);
const startTime = "2026-11-23T07:30:00.000Z";
const endTime = "2026-11-23T08:30:00.000Z";

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-23T09:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("POST /api/sleep-sessions", () => {
  it("creates an ongoing tracker session through the dedicated operation", async () => {
    vi.mocked(createTrackerSleepSession).mockResolvedValue({ id: "session-1" });

    const response = await app.request("/api/sleep-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startTime, endTime: null }),
    });

    expect(response.status).toBe(201);
    expect(createTrackerSleepSession).toHaveBeenCalledWith({
      startTime: new Date(startTime),
      endTime: null,
    });
  });

  it("creates a completed past session and lets the backend calculate duration", async () => {
    vi.mocked(createTrackerSleepSession).mockResolvedValue({ id: "session-2" });

    const response = await app.request("/api/sleep-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startTime, endTime }),
    });

    expect(response.status).toBe(201);
    expect(createTrackerSleepSession).toHaveBeenCalledWith({
      startTime: new Date(startTime),
      endTime: new Date(endTime),
    });
  });

  it("rejects invalid timestamps and end times not after start", async () => {
    const invalidDate = await app.request("/api/sleep-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startTime: "not-a-date", endTime: null }),
    });
    const invalidInterval = await app.request("/api/sleep-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startTime, endTime: startTime }),
    });

    expect(invalidDate.status).toBe(400);
    expect(invalidInterval.status).toBe(400);
    expect(createTrackerSleepSession).not.toHaveBeenCalled();
  });

  it("rejects future starts and completed-session ends beyond two minutes of clock skew", async () => {
    const futureStart = await app.request("/api/sleep-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startTime: "2026-11-23T09:02:01.000Z",
        endTime: null,
      }),
    });
    const futureEnd = await app.request("/api/sleep-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startTime: "2026-11-23T08:00:00.000Z",
        endTime: "2026-11-23T09:02:01.000Z",
      }),
    });

    expect(futureStart.status).toBe(400);
    expect(futureEnd.status).toBe(400);
    expect(createTrackerSleepSession).not.toHaveBeenCalled();
  });

  it("allows timestamps within the documented two-minute clock-skew tolerance", async () => {
    vi.mocked(createTrackerSleepSession).mockResolvedValue({ id: "session-3" });

    const response = await app.request("/api/sleep-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startTime: "2026-11-23T09:02:00.000Z",
        endTime: null,
      }),
    });

    expect(response.status).toBe(201);
  });

  it("rejects a client-supplied tracker marker", async () => {
    const response = await app.request("/api/sleep-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startTime,
        endTime: null,
        is_tracker_session: false,
      }),
    });

    expect(response.status).toBe(400);
    expect(createTrackerSleepSession).not.toHaveBeenCalled();
  });

  it("returns 409 for a concurrent active-session conflict", async () => {
    vi.mocked(createTrackerSleepSession).mockRejectedValue(
      Object.assign(
        new Error('duplicate key violates "idx_one_active_sleep_per_baby"'),
        { code: "23505" },
      ),
    );

    const response = await app.request("/api/sleep-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startTime, endTime: null }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "An active sleep session already exists.",
    });
  });

  it("recognizes the pre-swap tracker index name during staged migration", async () => {
    vi.mocked(createTrackerSleepSession).mockRejectedValue(
      Object.assign(
        new Error('duplicate key violates "idx_one_active_tracker_sleep_per_baby"'),
        { code: "23505" },
      ),
    );

    const response = await app.request("/api/sleep-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startTime, endTime: null }),
    });

    expect(response.status).toBe(409);
  });

  it("logs sanitized diagnostics for database failures", async () => {
    vi.mocked(createTrackerSleepSession).mockRejectedValue(
      Object.assign(new Error("Sensitive database value 123"), {
        code: "08006",
      }),
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await app.request("/api/sleep-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startTime, endTime: null }),
    });

    expect(response.status).toBe(500);
    expect(log).toHaveBeenCalledWith(
      "Sleep tracker database operation failed.",
      { operation: "create", errorClass: "Error", databaseCode: "08006" },
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain(
      "Sensitive database value 123",
    );
  });
});

describe("PATCH /api/sleep-sessions/:id/complete", () => {
  it("completes the specified active tracker session", async () => {
    vi.mocked(completeTrackerSleepSession).mockResolvedValue({
      status: "completed",
    });

    const response = await app.request(
      "/api/sleep-sessions/00000000-0000-4000-8000-000000000001/complete",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endTime }),
      },
    );

    expect(response.status).toBe(200);
    expect(completeTrackerSleepSession).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
      new Date(endTime),
    );
  });

  it("rejects an invalid completion timestamp", async () => {
    const response = await app.request(
      "/api/sleep-sessions/00000000-0000-4000-8000-000000000001/complete",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endTime: "not-a-date" }),
      },
    );

    expect(response.status).toBe(400);
    expect(completeTrackerSleepSession).not.toHaveBeenCalled();
  });

  it("rejects future completion requests beyond the clock-skew tolerance", async () => {
    const response = await app.request(
      "/api/sleep-sessions/00000000-0000-4000-8000-000000000001/complete",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endTime: "2026-11-23T09:02:01.000Z" }),
      },
    );

    expect(response.status).toBe(400);
    expect(completeTrackerSleepSession).not.toHaveBeenCalled();
  });

  it("allows completion exactly at the two-minute future tolerance boundary", async () => {
    vi.mocked(completeTrackerSleepSession).mockResolvedValue({
      status: "completed",
    });

    const response = await app.request(
      "/api/sleep-sessions/00000000-0000-4000-8000-000000000001/complete",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endTime: "2026-11-23T09:02:00.000Z" }),
      },
    );

    expect(response.status).toBe(200);
    expect(completeTrackerSleepSession).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
      new Date("2026-11-23T09:02:00.000Z"),
    );
  });

  it("reports a conflict if another request completed the session first", async () => {
    vi.mocked(completeTrackerSleepSession).mockResolvedValue({
      status: "conflict",
    });

    const response = await app.request(
      "/api/sleep-sessions/00000000-0000-4000-8000-000000000001/complete",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endTime }),
      },
    );

    expect(response.status).toBe(409);
  });

  it("logs sanitized diagnostics for completion database failures", async () => {
    vi.mocked(completeTrackerSleepSession).mockRejectedValue(
      Object.assign(new Error("Sensitive row details"), { code: "XX999" }),
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await app.request(
      "/api/sleep-sessions/00000000-0000-4000-8000-000000000001/complete",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endTime }),
      },
    );

    expect(response.status).toBe(500);
    expect(log).toHaveBeenCalledWith(
      "Sleep tracker database operation failed.",
      { operation: "complete", errorClass: "Error" },
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain("Sensitive row details");
    expect(JSON.stringify(log.mock.calls)).not.toContain("XX999");
  });
});
