import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  single: vi.fn(),
  result: null as unknown,
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: mocks.from,
  },
}));

import { createFamilyNote, getFamilyNotes } from "./notes.repository";

const queryBuilder = {
  select: mocks.select,
  insert: mocks.insert,
  eq: mocks.eq,
  order: mocks.order,
  single: mocks.single,

  then: (
    resolve: (value: unknown) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(mocks.result).then(resolve, reject),
};

beforeEach(() => {
  vi.clearAllMocks();

  mocks.from.mockReturnValue(queryBuilder);
  mocks.select.mockReturnValue(queryBuilder);
  mocks.insert.mockReturnValue(queryBuilder);
  mocks.eq.mockReturnValue(queryBuilder);
  mocks.order.mockReturnValue(queryBuilder);
  mocks.single.mockImplementation(() => Promise.resolve(mocks.result));

  mocks.result = { data: [], error: null };

  vi.stubEnv("BABYOS_DEV_FAMILY_ID", "test-family-id");
  vi.stubEnv("BABYOS_DEV_BABY_ID", "test-baby-id");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getFamilyNotes", () => {
  it("fetches notes scoped to the configured family and baby", async () => {
    mocks.result = {
      data: [
        {
          id: "note-1",
          content: "Baby slept well",
          created_at: "2026-11-23T10:00:00.000Z",
        },
      ],
      error: null,
    };

    await expect(getFamilyNotes()).resolves.toEqual([
      {
        id: "note-1",
        content: "Baby slept well",
        createdAt: "2026-11-23T10:00:00.000Z",
      },
    ]);

    expect(mocks.from).toHaveBeenCalledWith("family_notes");
    expect(mocks.select).toHaveBeenCalledWith("id, content, created_at");
    expect(mocks.eq).toHaveBeenNthCalledWith(1, "family_id", "test-family-id");
    expect(mocks.eq).toHaveBeenNthCalledWith(2, "baby_id", "test-baby-id");
    expect(mocks.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
  });

  it("returns an empty array when no notes exist", async () => {
    mocks.result = { data: [], error: null };

    await expect(getFamilyNotes()).resolves.toEqual([]);
  });

  it("throws when development IDs are missing", async () => {
    vi.stubEnv("BABYOS_DEV_BABY_ID", "");

    await expect(getFamilyNotes()).rejects.toThrow(
      "Development family or baby ID is not configured.",
    );

    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("throws when Supabase returns an error", async () => {
    const error = new Error("Database unavailable");
    mocks.result = { data: null, error };

    await expect(getFamilyNotes()).rejects.toBe(error);
  });
});

describe("createFamilyNote", () => {
  it("creates a note with the configured family and baby IDs", async () => {
    mocks.result = {
      data: {
        id: "note-1",
        content: "Baby slept well",
        created_at: "2026-11-23T10:00:00.000Z",
      },
      error: null,
    };

    await expect(
      createFamilyNote({ content: "Baby slept well" }),
    ).resolves.toEqual({
      id: "note-1",
      content: "Baby slept well",
      createdAt: "2026-11-23T10:00:00.000Z",
    });

    expect(mocks.from).toHaveBeenCalledWith("family_notes");
    expect(mocks.insert).toHaveBeenCalledWith({
      family_id: "test-family-id",
      baby_id: "test-baby-id",
      content: "Baby slept well",
    });
    expect(mocks.select).toHaveBeenCalledWith("id, content, created_at");
    expect(mocks.single).toHaveBeenCalledOnce();
  });

  it("throws when development IDs are missing", async () => {
    vi.stubEnv("BABYOS_DEV_FAMILY_ID", "");

    await expect(
      createFamilyNote({ content: "Baby slept well" }),
    ).rejects.toThrow("Development family or baby ID is not configured.");

    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("throws when Supabase returns an error", async () => {
    const error = new Error("Insert failed");
    mocks.result = { data: null, error };

    await expect(createFamilyNote({ content: "Baby slept well" })).rejects.toBe(
      error,
    );
  });
});
