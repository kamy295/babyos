import type { Task } from "../../types/tasks";
import type { LegacyTaskInput } from "./taskApi";

export const LEGACY_TASKS_STORAGE_KEY = "babyos:tasks";
export const LEGACY_TASKS_SOURCE_ID_KEY = "babyos:tasks:source-id";
export const TASKS_MIGRATION_STORAGE_KEY = "babyos:tasks:supabase-migrated";
const IMPORT_BATCH_SIZE = 100;

export type LegacyTask = {
  id: number;
  title: string;
  dueDate: string;
  completed: boolean;
  createdAt: string;
};

export type TaskStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function getLegacyTaskSourceId(storage: TaskStorage): string {
  const storedSourceId = storage.getItem(LEGACY_TASKS_SOURCE_ID_KEY);
  if (storedSourceId) return storedSourceId;

  const sourceId = crypto.randomUUID();
  storage.setItem(LEGACY_TASKS_SOURCE_ID_KEY, sourceId);
  return sourceId;
}

function getLegacyIds(tasks: LegacyTask[], sourceId: string): string[] {
  const totals = new Map<number, number>();
  for (const task of tasks) totals.set(task.id, (totals.get(task.id) ?? 0) + 1);

  const occurrences = new Map<number, number>();
  return tasks.map((task) => {
    const occurrence = (occurrences.get(task.id) ?? 0) + 1;
    occurrences.set(task.id, occurrence);
    return (totals.get(task.id) ?? 0) > 1
      ? `${sourceId}:${task.id}:${occurrence}`
      : `${sourceId}:${task.id}`;
  });
}

function isLegacyTask(value: unknown): value is LegacyTask {
  if (typeof value !== "object" || value === null) return false;
  const task = value as Record<string, unknown>;

  return (
    typeof task.id === "number" &&
    Number.isSafeInteger(task.id) &&
    typeof task.title === "string" &&
    task.title.trim().length > 0 &&
    typeof task.dueDate === "string" &&
    (task.dueDate === "" || isValidIsoDate(task.dueDate)) &&
    typeof task.completed === "boolean" &&
    typeof task.createdAt === "string" &&
    Number.isFinite(Date.parse(task.createdAt))
  );
}

export function readLegacyTasks(storage: TaskStorage): LegacyTask[] {
  const stored = storage.getItem(LEGACY_TASKS_STORAGE_KEY);
  if (!stored) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error("Saved local tasks could not be read. They remain on this device.");
  }

  if (!Array.isArray(parsed) || !parsed.every(isLegacyTask)) {
    throw new Error("Saved local tasks have an unsupported format. They remain on this device.");
  }

  return parsed;
}

export function showLegacyTasks(legacyTasks: LegacyTask[], sourceId: string): Task[] {
  const legacyIds = getLegacyIds(legacyTasks, sourceId);
  return legacyTasks.map((task, index) => {
    const legacyId = legacyIds[index] ?? String(task.id);
    return {
      id: `legacy:${legacyId}`,
      legacyId,
      title: task.title,
      dueDate: task.dueDate,
      completed: task.completed,
      createdAt: task.createdAt,
    };
  });
}

export function mergeLegacyTasks(
  serverTasks: Task[],
  legacyTasks: LegacyTask[],
  sourceId: string,
): Task[] {
  const existingLegacyIds = new Set(
    serverTasks.flatMap((task) => (task.legacyId ? [task.legacyId] : [])),
  );

  return [
    ...serverTasks,
    ...showLegacyTasks(legacyTasks, sourceId).filter(
      (task) => !task.legacyId || !existingLegacyIds.has(task.legacyId),
    ),
  ];
}

export async function migrateLegacyTasks(
  storage: TaskStorage,
  importBatch: (tasks: LegacyTaskInput[]) => Promise<void>,
  fetchTasks: () => Promise<Task[]>,
): Promise<{ status: "imported"; tasks: Task[] } | { status: "skipped" }> {
  if (storage.getItem(TASKS_MIGRATION_STORAGE_KEY) === "true") {
    return { status: "skipped" };
  }

  const legacyTasks = readLegacyTasks(storage);
  if (legacyTasks.length === 0) {
    storage.setItem(TASKS_MIGRATION_STORAGE_KEY, "true");
    return { status: "skipped" };
  }

  const sourceId = getLegacyTaskSourceId(storage);
  const batches: LegacyTaskInput[][] = [];
  const legacyIds = getLegacyIds(legacyTasks, sourceId);
  for (let offset = 0; offset < legacyTasks.length; offset += IMPORT_BATCH_SIZE) {
    batches.push(
      legacyTasks.slice(offset, offset + IMPORT_BATCH_SIZE).map((task, index) => ({
        legacyId: legacyIds[offset + index] ?? String(task.id),
        title: task.title.trim(),
        dueDate: task.dueDate || null,
        completed: task.completed,
        createdAt: new Date(task.createdAt).toISOString(),
      })),
    );
  }

  for (const batch of batches) await importBatch(batch);

  // Verify that every imported task is readable before removing the local copy.
  const tasks = await fetchTasks();
  const importedIds = new Set(
    tasks.flatMap((task) => (task.legacyId ? [task.legacyId] : [])),
  );
  if (legacyIds.some((legacyId) => !importedIds.has(legacyId))) {
    throw new Error("Saved tasks could not be confirmed on the server. They remain on this device.");
  }

  storage.setItem(TASKS_MIGRATION_STORAGE_KEY, "true");
  try {
    storage.removeItem(LEGACY_TASKS_STORAGE_KEY);
  } catch {
    // The confirmed server copy and marker make a later retry unnecessary.
  }
  return { status: "imported", tasks };
}
