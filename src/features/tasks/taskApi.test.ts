import { describe, expect, it, vi } from "vitest";
import {
  createTask,
  deleteTask,
  getTasks,
  importLegacyTaskBatch,
  updateTask,
} from "./taskApi";

const task = {
  id: "10000000-0000-4000-8000-000000000001",
  title: "Buy diapers",
  dueDate: "2026-11-26",
  completed: false,
  createdAt: "2026-11-25T08:00:00.000Z",
};

describe("task API", () => {
  it("fetches persisted tasks", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ tasks: [task] }),
    );
    await expect(getTasks(fetcher)).resolves.toEqual([task]);
    expect(fetcher).toHaveBeenCalledWith("/api/tasks");
  });

  it("creates tasks while preserving optional due dates", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ task }),
    );
    await expect(
      createTask({ title: task.title, dueDate: null }, fetcher),
    ).resolves.toEqual(task);
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body))).toEqual({
      title: task.title,
      dueDate: null,
    });
  });

  it("updates completion or pending state and deletes a task", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({ task: { ...task, completed: true } }))
      .mockResolvedValueOnce(Response.json({ message: "Task deleted successfully." }));

    await expect(
      updateTask(task.id, { completed: true }, fetcher),
    ).resolves.toMatchObject({ completed: true });
    await expect(deleteTask(task.id, fetcher)).resolves.toBeUndefined();
    expect(fetcher.mock.calls[0]?.[1]?.method).toBe("PATCH");
    expect(fetcher.mock.calls[1]?.[1]?.method).toBe("DELETE");
  });

  it("reports server failures instead of silently accepting mutations", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ error: "Task database unavailable." }, { status: 500 }),
    );
    await expect(
      createTask({ title: task.title, dueDate: null }, fetcher),
    ).rejects.toThrow("Task database unavailable.");
  });

  it("posts stable legacy identifiers for idempotent imports", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ imported: true }),
    );
    await importLegacyTaskBatch(
      [
        {
          legacyId: "1700000000000",
          title: task.title,
          dueDate: null,
          completed: false,
          createdAt: task.createdAt,
        },
      ],
      fetcher,
    );
    expect(fetcher).toHaveBeenCalledWith(
      "/api/tasks/import-legacy",
      expect.objectContaining({ method: "POST" }),
    );
    expect(JSON.parse(String(fetcher.mock.calls[0]?.[1]?.body)).tasks[0]).toMatchObject({
      legacyId: "1700000000000",
      dueDate: null,
    });
  });
});
