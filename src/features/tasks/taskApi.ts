import type { Task } from "../../types/tasks";

export type CreateTaskInput = { title: string; dueDate: string | null };
export type UpdateTaskInput = {
  title?: string;
  dueDate?: string | null;
  completed?: boolean;
};
export type LegacyTaskInput = CreateTaskInput & {
  legacyId: string;
  completed: boolean;
  createdAt: string;
};

async function readResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to save tasks. Please try again.");
  }

  return data;
}

export async function getTasks(fetcher: typeof fetch = fetch): Promise<Task[]> {
  const response = await fetcher("/api/tasks");
  const data = await readResponse<{ tasks: Task[] }>(response);
  return data.tasks;
}

export async function createTask(
  input: CreateTaskInput,
  fetcher: typeof fetch = fetch,
): Promise<Task> {
  const response = await fetcher("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readResponse<{ task: Task }>(response);
  return data.task;
}

export async function updateTask(
  taskId: string,
  input: UpdateTaskInput,
  fetcher: typeof fetch = fetch,
): Promise<Task> {
  const response = await fetcher(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await readResponse<{ task: Task }>(response);
  return data.task;
}

export async function deleteTask(
  taskId: string,
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const response = await fetcher(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: "DELETE",
  });
  await readResponse<{ message: string }>(response);
}

export async function importLegacyTaskBatch(
  legacyTasks: LegacyTaskInput[],
  fetcher: typeof fetch = fetch,
): Promise<void> {
  const response = await fetcher("/api/tasks/import-legacy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tasks: legacyTasks }),
  });
  await readResponse<{ imported: boolean }>(response);
}
