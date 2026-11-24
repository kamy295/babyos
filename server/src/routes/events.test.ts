const {
  createBabyEvent,
  deleteBabyEvent,
  getBabyEvents,
  getBabyEventsPage,
  updateBabyEvent,
} = vi.hoisted(() => ({
  createBabyEvent: vi.fn(),
  deleteBabyEvent: vi.fn(),
  getBabyEvents: vi.fn(),
  getBabyEventsPage: vi.fn(),
  updateBabyEvent: vi.fn(),
}));

vi.mock("../repositories/events.repository", () => ({
  createBabyEvent,
  deleteBabyEvent,
  getBabyEvents,
  getBabyEventsPage,
  updateBabyEvent,
}));

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import events from "./events";

const app = new Hono().route("/api/events", events);

const eventInput = {
  content: "Baby slept for one hour",
  category: "Sleep",
  eventDate: "2026-11-23",
  startTime: "13:00:00",
  endTime: null,
  quantity: null,
  unit: null,
  durationMinutes: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/events", () => {
  it("preserves the unpaginated response for existing callers", async () => {
    vi.mocked(getBabyEvents).mockResolvedValue([{ id: "event-old" }] as never);

    const response = await app.request("/api/events");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ events: [{ id: "event-old" }] });
    expect(getBabyEventsPage).not.toHaveBeenCalled();
  });

  it("supports an unpaginated category query for existing timeline consumers", async () => {
    vi.mocked(getBabyEvents).mockResolvedValue([{ id: "sleep-event" }] as never);

    const response = await app.request("/api/events?category=Sleep");

    expect(response.status).toBe(200);
    expect(getBabyEvents).toHaveBeenCalledWith("Sleep");
    expect(await response.json()).toEqual({ events: [{ id: "sleep-event" }] });
  });

  it.each([5, 10, 15, 20, 50])("supports page size %s", async (pageSize) => {
    vi.mocked(getBabyEventsPage).mockResolvedValue({
      events: [{ id: "event-1" }],
      totalRecords: 21,
    } as never);

    const response = await app.request(
      `/api/events?page=2&pageSize=${pageSize}&category=Sleep`,
    );

    expect(response.status).toBe(200);
    expect(getBabyEventsPage).toHaveBeenCalledWith(2, pageSize, "Sleep");
    expect(await response.json()).toEqual({
      events: [{ id: "event-1" }],
      pagination: {
        page: 2,
        pageSize,
        totalRecords: 21,
        totalPages: Math.ceil(21 / pageSize),
      },
    });
  });

  it("defaults omitted pagination values and supports an empty result", async () => {
    vi.mocked(getBabyEventsPage).mockResolvedValue({
      events: [],
      totalRecords: 0,
    } as never);

    const response = await app.request("/api/events?pageSize=10");

    expect(response.status).toBe(200);
    expect(getBabyEventsPage).toHaveBeenCalledWith(1, 10, undefined);
    expect(await response.json()).toEqual({
      events: [],
      pagination: { page: 1, pageSize: 10, totalRecords: 0, totalPages: 0 },
    });
  });

  it("returns one page when the filtered result is shorter than the selected size", async () => {
    vi.mocked(getBabyEventsPage).mockResolvedValue({
      events: [{ id: "sleep-event-1" }, { id: "sleep-event-2" }],
      totalRecords: 2,
    } as never);

    const response = await app.request(
      "/api/events?page=1&pageSize=10&category=Sleep",
    );

    expect(await response.json()).toMatchObject({
      events: [{ id: "sleep-event-1" }, { id: "sleep-event-2" }],
      pagination: { page: 1, pageSize: 10, totalRecords: 2, totalPages: 1 },
    });
  });

  it.each(["page=0&pageSize=10", "page=-1&pageSize=10", "page=1&pageSize=12"])(
    "rejects invalid pagination query %s",
    async (query) => {
      const response = await app.request(`/api/events?${query}`);

      expect(response.status).toBe(400);
      expect(getBabyEventsPage).not.toHaveBeenCalled();
    },
  );
});

describe("POST /api/events", () => {
  it("ignores a forged tracker marker and creates an ordinary event", async () => {
    vi.mocked(createBabyEvent).mockResolvedValue({ id: "event-1" } as never);

    const response = await app.request("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...eventInput, is_tracker_session: true }),
    });

    expect(response.status).toBe(201);
    expect(createBabyEvent).toHaveBeenCalledWith(eventInput);
  });
});
