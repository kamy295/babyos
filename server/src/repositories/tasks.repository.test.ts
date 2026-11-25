import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  upsert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  maybeSingle: vi.fn(),
  single: vi.fn(),
  result: null as unknown,
}));

vi.mock("../lib/supabase", () => ({ supabase: { from: mocks.from } }));

import {
  createFamilyTask,
  deleteFamilyTask,
  getFamilyTasks,
  importFamilyTasks,
  updateFamilyTask,
} from "./tasks.repository";

const queryBuilder = {
  select: mocks.select,
  insert: mocks.insert,
  upsert: mocks.upsert,
  update: mocks.update,
  delete: mocks.delete,
  eq: mocks.eq,
  order: mocks.order,
  maybeSingle: mocks.maybeSingle,
  single: mocks.single,
  then: (
    resolve: (value: unknown) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(mocks.result).then(resolve, reject),
};

const row = {
  id: "10000000-0000-4000-8000-000000000001",
  title: "Buy diapers",
  due_date: "2026-11-26",
  completed: false,
  created_at: "2026-11-25T08:00:00.000Z",
  legacy_id: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockReturnValue(queryBuilder);
  for (const method of [
    mocks.select,
    mocks.insert,
    mocks.upsert,
    mocks.update,
    mocks.delete,
    mocks.eq,
    mocks.order,
  ]) {
    method.mockReturnValue(queryBuilder);
  }
  mocks.maybeSingle.mockImplementation(() => Promise.resolve(mocks.result));
  mocks.single.mockImplementation(() => Promise.resolve(mocks.result));
  mocks.result = { data: [], error: null };
  vi.stubEnv("BABYOS_DEV_FAMILY_ID", "family-1");
  vi.stubEnv("BABYOS_DEV_BABY_ID", "baby-1");
});

afterEach(() => vi.unstubAllEnvs());

describe("getFamilyTasks", () => {
  it("lists only the configured family tasks newest first", async () => {
    mocks.result = { data: [row], error: null };

    await expect(getFamilyTasks()).resolves.toEqual([
      {
        id: row.id,
        title: row.title,
        dueDate: row.due_date,
        completed: false,
        createdAt: row.created_at,
      },
    ]);

    expect(mocks.from).toHaveBeenCalledWith("tasks");
    expect(mocks.eq).toHaveBeenCalledWith("family_id", "family-1");
    expect(mocks.order).toHaveBeenNthCalledWith(1, "created_at", {
      ascending: false,
    });
    expect(mocks.order).toHaveBeenNthCalledWith(2, "id", {
      ascending: false,
    });
  });

  it("requires configured family and baby context", async () => {
    vi.stubEnv("BABYOS_DEV_FAMILY_ID", "");
    await expect(getFamilyTasks()).rejects.toThrow(
      "Development family or baby ID is not configured.",
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe("createFamilyTask", () => {
  it("creates a pending task with optional due date in the configured family", async () => {
    mocks.result = { data: row, error: null };

    await expect(
      createFamilyTask({ title: "Buy diapers", dueDate: row.due_date }),
    ).resolves.toMatchObject({ id: row.id, dueDate: row.due_date });

    expect(mocks.insert).toHaveBeenCalledWith({
      family_id: "family-1",
      baby_id: "baby-1",
      title: "Buy diapers",
      due_date: row.due_date,
      completed: false,
      completed_at: null,
    });
  });
});

describe("updateFamilyTask", () => {
  it("updates completion and due date only within the configured family", async () => {
    mocks.result = { data: { ...row, due_date: null, completed: true }, error: null };

    await expect(
      updateFamilyTask(row.id, { completed: true, dueDate: null }),
    ).resolves.toMatchObject({ completed: true, dueDate: "" });

    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        completed: true,
        due_date: null,
        completed_at: expect.any(String),
        updated_at: expect.any(String),
      }),
    );
    expect(mocks.eq).toHaveBeenCalledWith("id", row.id);
    expect(mocks.eq).toHaveBeenCalledWith("family_id", "family-1");
  });

  it("returns null for an ID outside the family", async () => {
    mocks.result = { data: null, error: null };
    await expect(updateFamilyTask(row.id, { title: "Changed" })).resolves.toBe(
      null,
    );
  });
});

describe("deleteFamilyTask", () => {
  it("deletes only within the configured family", async () => {
    mocks.result = { data: { id: row.id }, error: null };
    await expect(deleteFamilyTask(row.id)).resolves.toBe(true);
    expect(mocks.eq).toHaveBeenCalledWith("family_id", "family-1");
  });

  it("returns false for an ID outside the family", async () => {
    mocks.result = { data: null, error: null };
    await expect(deleteFamilyTask(row.id)).resolves.toBe(false);
  });
});

describe("importFamilyTasks", () => {
  it("sets completed_at from createdAt for imported completed tasks", async () => {
    await importFamilyTasks([
      {
        legacyId: "source-a:1700000000000",
        title: "Buy diapers",
        dueDate: null,
        completed: true,
        createdAt: "2026-11-25T08:00:00.000Z",
      },
    ]);

    expect(mocks.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          family_id: "family-1",
          baby_id: "baby-1",
          legacy_id: "source-a:1700000000000",
          due_date: null,
          completed: true,
          completed_at: "2026-11-25T08:00:00.000Z",
          created_at: "2026-11-25T08:00:00.000Z",
        }),
      ],
      { onConflict: "family_id,legacy_id", ignoreDuplicates: true },
    );
  });

  it("preserves null completed_at for imported pending tasks", async () => {
    await importFamilyTasks([
      {
        legacyId: "source-a:1",
        title: "Buy diapers",
        dueDate: null,
        completed: false,
        createdAt: "2026-11-25T08:00:00.000Z",
      },
    ]);

    expect(mocks.upsert).toHaveBeenCalledWith(
      [expect.objectContaining({ completed: false, completed_at: null })],
      { onConflict: "family_id,legacy_id", ignoreDuplicates: true },
    );
  });
});
