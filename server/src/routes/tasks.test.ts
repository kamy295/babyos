const {
  createFamilyTask,
  deleteFamilyTask,
  getFamilyTasks,
  importFamilyTasks,
  updateFamilyTask,
} = vi.hoisted(() => ({
  createFamilyTask: vi.fn(),
  deleteFamilyTask: vi.fn(),
  getFamilyTasks: vi.fn(),
  importFamilyTasks: vi.fn(),
  updateFamilyTask: vi.fn(),
}));

vi.mock("../repositories/tasks.repository", () => ({
  createFamilyTask,
  deleteFamilyTask,
  getFamilyTasks,
  importFamilyTasks,
  updateFamilyTask,
}));

import { beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import tasks from "./tasks";

const app = new Hono().route("/api/tasks", tasks);
const taskId = "10000000-0000-4000-8000-000000000001";
const task = {
  id: taskId,
  title: "Buy diapers",
  dueDate: "2026-11-26",
  completed: false,
  createdAt: "2026-11-25T08:00:00.000Z",
};

beforeEach(() => vi.clearAllMocks());

describe("GET /api/tasks", () => {
  it("returns tasks from the repository", async () => {
    vi.mocked(getFamilyTasks).mockResolvedValue([task]);
    const response = await app.request("/api/tasks");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tasks: [task] });
  });
});

describe("POST /api/tasks", () => {
  it("creates a task with an optional due date", async () => {
    vi.mocked(createFamilyTask).mockResolvedValue(task);
    const response = await app.request("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Buy diapers", dueDate: task.dueDate }),
    });

    expect(response.status).toBe(201);
    expect(createFamilyTask).toHaveBeenCalledWith({
      title: "Buy diapers",
      dueDate: task.dueDate,
    });
  });

  it("accepts a null due date", async () => {
    vi.mocked(createFamilyTask).mockResolvedValue({ ...task, dueDate: "" });
    const response = await app.request("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Buy diapers", dueDate: null }),
    });

    expect(response.status).toBe(201);
    expect(createFamilyTask).toHaveBeenCalledWith({
      title: "Buy diapers",
      dueDate: null,
    });
  });

  it("rejects invalid fields and client-supplied family IDs", async () => {
    for (const body of [
      { title: "   ", dueDate: null },
      { title: "Buy diapers", dueDate: "not-a-date" },
      { title: "Buy diapers", dueDate: null, familyId: "other-family" },
    ]) {
      const response = await app.request("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(400);
    }
    expect(createFamilyTask).not.toHaveBeenCalled();
  });
});

describe("POST /api/tasks/import-legacy", () => {
  it("imports valid legacy tasks without accepting family IDs", async () => {
    const response = await app.request("/api/tasks/import-legacy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tasks: [
          {
            legacyId: "1700000000000",
            title: "Buy diapers",
            dueDate: null,
            completed: true,
            createdAt: "2026-11-25T08:00:00.000Z",
          },
        ],
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ imported: true });
    expect(importFamilyTasks).toHaveBeenCalledWith([
      {
        legacyId: "1700000000000",
        title: "Buy diapers",
        dueDate: null,
        completed: true,
        createdAt: "2026-11-25T08:00:00.000Z",
      },
    ]);
  });

  it("rejects invalid or empty import batches", async () => {
    for (const body of [{ tasks: [] }, { tasks: [{ legacyId: "x" }] }]) {
      const response = await app.request("/api/tasks/import-legacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(400);
    }
    expect(importFamilyTasks).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/tasks/:id", () => {
  it("updates task details and completion", async () => {
    vi.mocked(updateFamilyTask).mockResolvedValue({ ...task, completed: true });
    const response = await app.request(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Buy wipes", dueDate: null, completed: true }),
    });

    expect(response.status).toBe(200);
    expect(updateFamilyTask).toHaveBeenCalledWith(taskId, {
      title: "Buy wipes",
      dueDate: null,
      completed: true,
    });
  });

  it("rejects invalid IDs, empty updates, and client-supplied family IDs", async () => {
    for (const [path, body] of [
      ["not-a-uuid", { completed: true }],
      [taskId, {}],
      [taskId, { completed: true, familyId: "other-family" }],
    ]) {
      const response = await app.request(`/api/tasks/${path}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(400);
    }
    expect(updateFamilyTask).not.toHaveBeenCalled();
  });

  it("returns not found for a task outside the current family", async () => {
    vi.mocked(updateFamilyTask).mockResolvedValue(null);
    const response = await app.request(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/tasks/:id", () => {
  it("deletes the requested task", async () => {
    vi.mocked(deleteFamilyTask).mockResolvedValue(true);
    const response = await app.request(`/api/tasks/${taskId}`, {
      method: "DELETE",
    });
    expect(response.status).toBe(200);
    expect(deleteFamilyTask).toHaveBeenCalledWith(taskId);
  });

  it("returns not found when the task is outside the current family", async () => {
    vi.mocked(deleteFamilyTask).mockResolvedValue(false);
    const response = await app.request(`/api/tasks/${taskId}`, {
      method: "DELETE",
    });
    expect(response.status).toBe(404);
  });
});
