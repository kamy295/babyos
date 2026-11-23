import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  maybeSingle: vi.fn(),
  single: vi.fn(),
  result: null as unknown,
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: mocks.from,
  },
}));

import {
  createBabyEvent,
  deleteBabyEvent,
  getBabyEvents,
  updateBabyEvent,
} from "./events.repository";

const queryBuilder = {
  select: mocks.select,
  delete: mocks.delete,
  update: mocks.update,
  insert: mocks.insert,
  eq: mocks.eq,
  order: mocks.order,
  maybeSingle: mocks.maybeSingle,
  single: mocks.single,

  // Allows the mocked query builder to behave like a Supabase query.
  then: (
    resolve: (value: unknown) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(mocks.result).then(resolve, reject),
};

const eventInput = {
  content: "Baby slept from 1 PM to 3 PM",
  category: "Sleep" as const,
  eventDate: "2026-11-23",
  startTime: "13:00",
  endTime: "15:00",
  quantity: null,
  unit: null,
  durationMinutes: 120,
};

beforeEach(() => {
  vi.clearAllMocks();

  mocks.from.mockReturnValue(queryBuilder);

  mocks.select.mockReturnValue(queryBuilder);
  mocks.delete.mockReturnValue(queryBuilder);
  mocks.update.mockReturnValue(queryBuilder);
  mocks.insert.mockReturnValue(queryBuilder);
  mocks.eq.mockReturnValue(queryBuilder);
  mocks.order.mockReturnValue(queryBuilder);
  mocks.maybeSingle.mockReturnValue(queryBuilder);
  mocks.single.mockReturnValue(queryBuilder);

  mocks.result = { data: [], error: null };

  vi.stubEnv("BABYOS_DEV_FAMILY_ID", "test-family-id");
  vi.stubEnv("BABYOS_DEV_BABY_ID", "test-baby-id");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getBabyEvents", () => {
  it("fetches events scoped to the configured family and baby", async () => {
    const events = [{ id: "event-1", content: "Baby slept" }];
    mocks.result = { data: events, error: null };

    await expect(getBabyEvents()).resolves.toEqual(events);

    expect(mocks.from).toHaveBeenCalledWith("baby_events");
    expect(mocks.select).toHaveBeenCalledOnce();
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "family_id", "test-family-id");
    expect(mocks.eq).toHaveBeenNthCalledWith(2, "baby_id", "test-baby-id");
    expect(mocks.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
  });

  it("throws when the family or baby ID is missing", async () => {
    vi.stubEnv("BABYOS_DEV_FAMILY_ID", "");

    await expect(getBabyEvents()).rejects.toThrow(
      "Development family or baby ID is not configured.",
    );

    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("throws when Supabase returns an error", async () => {
    const error = new Error("Database unavailable");
    mocks.result = { data: null, error };

    await expect(getBabyEvents()).rejects.toBe(error);
  });
});

describe("deleteBabyEvent", () => {
  it("deletes an event scoped to the configured family and baby", async () => {
    mocks.result = { data: [{ id: "event-1" }], error: null };

    await expect(deleteBabyEvent("event-1")).resolves.toBe(true);

    expect(mocks.from).toHaveBeenCalledWith("baby_events");
    expect(mocks.delete).toHaveBeenCalledOnce();
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "id", "event-1");
    expect(mocks.eq).toHaveBeenNthCalledWith(2, "family_id", "test-family-id");
    expect(mocks.eq).toHaveBeenNthCalledWith(3, "baby_id", "test-baby-id");
  });

  it("returns false when no event was deleted", async () => {
    mocks.result = { data: [], error: null };

    await expect(deleteBabyEvent("missing-event")).resolves.toBe(false);
  });

  it("throws when Supabase returns an error", async () => {
    const error = new Error("Delete failed");
    mocks.result = { data: null, error };

    await expect(deleteBabyEvent("event-1")).rejects.toBe(error);
  });
});

describe("updateBabyEvent", () => {
  it("updates the event with the correct database fields", async () => {
    mocks.result = { data: { id: "event-1" }, error: null };

    await expect(updateBabyEvent("event-1", eventInput)).resolves.toBe(true);

    expect(mocks.update).toHaveBeenCalledWith({
      content: eventInput.content,
      category: eventInput.category,
      event_date: eventInput.eventDate,
      start_time: eventInput.startTime,
      end_time: eventInput.endTime,
      quantity: eventInput.quantity,
      unit: eventInput.unit,
      duration_minutes: eventInput.durationMinutes,
    });

    expect(mocks.eq).toHaveBeenCalledTimes(3);
    expect(mocks.maybeSingle).toHaveBeenCalledOnce();
  });

  it("returns false when the event does not exist", async () => {
    mocks.result = { data: null, error: null };

    await expect(updateBabyEvent("missing-event", eventInput)).resolves.toBe(
      false,
    );
  });

  it("throws when Supabase returns an error", async () => {
    const error = new Error("Update failed");
    mocks.result = { data: null, error };

    await expect(updateBabyEvent("event-1", eventInput)).rejects.toBe(error);
  });
});

describe("createBabyEvent", () => {
  it("creates an event with the configured family and baby IDs", async () => {
    const createdEvent = { id: "event-1", ...eventInput };
    mocks.result = { data: createdEvent, error: null };

    await expect(createBabyEvent(eventInput)).resolves.toEqual(createdEvent);

    expect(mocks.from).toHaveBeenCalledWith("baby_events");
    expect(mocks.insert).toHaveBeenCalledWith({
      family_id: "test-family-id",
      baby_id: "test-baby-id",
      source_note_id: null,
      content: eventInput.content,
      category: eventInput.category,
      event_date: eventInput.eventDate,
      start_time: eventInput.startTime,
      end_time: eventInput.endTime,
      quantity: eventInput.quantity,
      unit: eventInput.unit,
      duration_minutes: eventInput.durationMinutes,
    });

    expect(mocks.single).toHaveBeenCalledOnce();
  });

  it("throws when Supabase returns an error", async () => {
    const error = new Error("Insert failed");
    mocks.result = { data: null, error };

    await expect(createBabyEvent(eventInput)).rejects.toBe(error);
  });
});
