import { describe, expect, it, vi } from "vitest";
import type { Task } from "../../types/tasks";
import {
  LEGACY_TASKS_STORAGE_KEY,
  LEGACY_TASKS_SOURCE_ID_KEY,
  getLegacyTaskSourceId,
  mergeLegacyTasks,
  migrateLegacyTasks,
  readLegacyTasks,
  TASKS_MIGRATION_STORAGE_KEY,
  type LegacyTask,
  type TaskStorage,
} from "./taskMigration";

class MemoryStorage implements TaskStorage {
  values = new Map<string, string>();
  constructor(sourceId = "source-test") {
    this.values.set(LEGACY_TASKS_SOURCE_ID_KEY, sourceId);
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

const legacyTask = (id: number): LegacyTask => ({
  id,
  title: `Task ${id}`,
  dueDate: "",
  completed: false,
  createdAt: "2026-11-25T08:00:00.000Z",
});

const persisted = (task: LegacyTask, legacyId = `source-test:${task.id}`): Task => ({
  id: `server-${task.id}`,
  legacyId,
  title: task.title,
  dueDate: task.dueDate,
  completed: task.completed,
  createdAt: task.createdAt,
});

describe("localStorage task migration", () => {
  it("handles empty storage once without making an import request", async () => {
    const storage = new MemoryStorage();
    const importBatch = vi.fn();
    const fetchTasks = vi.fn();

    await expect(
      migrateLegacyTasks(storage, importBatch, fetchTasks),
    ).resolves.toEqual({ status: "skipped" });
    expect(importBatch).not.toHaveBeenCalled();
    expect(fetchTasks).not.toHaveBeenCalled();
    expect(storage.getItem(TASKS_MIGRATION_STORAGE_KEY)).toBe("true");
  });

  it("removes local records only after all batches and server confirmation succeed", async () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_TASKS_STORAGE_KEY, JSON.stringify([legacyTask(7)]));
    const importBatch = vi.fn().mockImplementation(async () => {
      expect(storage.getItem(LEGACY_TASKS_STORAGE_KEY)).not.toBeNull();
    });
    const fetchTasks = vi.fn().mockResolvedValue([persisted(legacyTask(7))]);

    await expect(
      migrateLegacyTasks(storage, importBatch, fetchTasks),
    ).resolves.toEqual({ status: "imported", tasks: [persisted(legacyTask(7))] });
    expect(importBatch).toHaveBeenCalledWith([
      expect.objectContaining({ legacyId: "source-test:7", dueDate: null }),
    ]);
    expect(storage.getItem(LEGACY_TASKS_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(TASKS_MIGRATION_STORAGE_KEY)).toBe("true");
  });

  it("keeps local records when server confirmation does not include every imported ID", async () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_TASKS_STORAGE_KEY, JSON.stringify([legacyTask(7)]));

    await expect(
      migrateLegacyTasks(storage, vi.fn().mockResolvedValue(undefined), vi.fn().mockResolvedValue([])),
    ).rejects.toThrow("remain on this device");
    expect(storage.getItem(LEGACY_TASKS_STORAGE_KEY)).not.toBeNull();
    expect(storage.getItem(TASKS_MIGRATION_STORAGE_KEY)).toBeNull();
  });

  it("keeps local records after a partially successful batch sequence and retries with the same IDs", async () => {
    const storage = new MemoryStorage();
    const legacy = Array.from({ length: 101 }, (_, index) => legacyTask(index + 1));
    storage.setItem(LEGACY_TASKS_STORAGE_KEY, JSON.stringify(legacy));
    const importBatch = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("Network interrupted"));
    const fetchTasks = vi.fn();

    await expect(
      migrateLegacyTasks(storage, importBatch, fetchTasks),
    ).rejects.toThrow("Network interrupted");
    expect(importBatch).toHaveBeenCalledTimes(2);
    expect(importBatch.mock.calls[0]?.[0]).toHaveLength(100);
    expect(importBatch.mock.calls[1]?.[0][0].legacyId).toBe("source-test:101");
    expect(storage.getItem(LEGACY_TASKS_STORAGE_KEY)).not.toBeNull();
    expect(storage.getItem(TASKS_MIGRATION_STORAGE_KEY)).toBeNull();

    importBatch.mockReset().mockResolvedValue(undefined);
    fetchTasks.mockResolvedValue(legacy.map((task) => persisted(task)));
    const retry = await migrateLegacyTasks(storage, importBatch, fetchTasks);
    expect(retry.status).toBe("imported");
    expect(importBatch.mock.calls[0]?.[0][0].legacyId).toBe("source-test:1");
    expect(storage.getItem(LEGACY_TASKS_STORAGE_KEY)).toBeNull();
  });

  it("does not import again once the migration marker is set", async () => {
    const storage = new MemoryStorage();
    storage.setItem(TASKS_MIGRATION_STORAGE_KEY, "true");
    const importBatch = vi.fn();

    await expect(
      migrateLegacyTasks(storage, importBatch, vi.fn()),
    ).resolves.toEqual({ status: "skipped" });
    expect(importBatch).not.toHaveBeenCalled();
  });

  it("rejects malformed data without deleting the stored records", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_TASKS_STORAGE_KEY, "not-json");
    expect(() => readLegacyTasks(storage)).toThrow("remain on this device");
    expect(storage.getItem(LEGACY_TASKS_STORAGE_KEY)).toBe("not-json");
  });

  it("merges fallback local tasks without duplicating records already on the server", () => {
    const legacy = [legacyTask(1), legacyTask(2)];
    const result = mergeLegacyTasks(
      [persisted(legacy[0]!)],
      legacy,
      "source-test",
    );
    expect(result.map((task) => task.legacyId)).toEqual([
      "source-test:1",
      "source-test:2",
    ]);
  });

  it("assigns stable distinct identifiers when legacy task IDs collide", async () => {
    const duplicateTasks = [legacyTask(7), { ...legacyTask(7), title: "Call clinic" }];
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_TASKS_STORAGE_KEY, JSON.stringify(duplicateTasks));
    const importBatch = vi.fn().mockResolvedValue(undefined);
    const fetchTasks = vi.fn().mockResolvedValue([
      { ...persisted(duplicateTasks[0]!), legacyId: "source-test:7:1" },
      {
        ...persisted(duplicateTasks[1]!),
        id: "server-7-2",
        legacyId: "source-test:7:2",
      },
    ]);

    await migrateLegacyTasks(storage, importBatch, fetchTasks);
    expect(importBatch.mock.calls[0]?.[0].map((task) => task.legacyId)).toEqual([
      "source-test:7:1",
      "source-test:7:2",
    ]);
  });

  it("keeps the same numeric task ID distinct across independent localStorage collections", async () => {
    const firstStorage = new MemoryStorage("collection-a");
    const secondStorage = new MemoryStorage("collection-b");
    for (const storage of [firstStorage, secondStorage]) {
      storage.setItem(LEGACY_TASKS_STORAGE_KEY, JSON.stringify([legacyTask(1)]));
    }
    const firstImport = vi.fn().mockResolvedValue(undefined);
    const secondImport = vi.fn().mockResolvedValue(undefined);

    const firstId = getLegacyTaskSourceId(firstStorage);
    const secondId = getLegacyTaskSourceId(secondStorage);
    await migrateLegacyTasks(
      firstStorage,
      firstImport,
      vi.fn().mockResolvedValue([persisted(legacyTask(1), `${firstId}:1`)]),
    );
    await migrateLegacyTasks(
      secondStorage,
      secondImport,
      vi.fn().mockResolvedValue([persisted(legacyTask(1), `${secondId}:1`)]),
    );

    const firstLegacyId = firstImport.mock.calls[0]?.[0][0].legacyId;
    const secondLegacyId = secondImport.mock.calls[0]?.[0][0].legacyId;
    expect(firstLegacyId).toBe("collection-a:1");
    expect(secondLegacyId).toBe("collection-b:1");
    expect(firstLegacyId).not.toBe(secondLegacyId);
  });
});
