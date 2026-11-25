import { Hono } from "hono";
import { z } from "zod";
import {
  createFamilyTask,
  deleteFamilyTask,
  getFamilyTasks,
  importFamilyTasks,
  updateFamilyTask,
} from "../repositories/tasks.repository";

const tasks = new Hono();
const taskIdSchema = z.string().uuid();
const taskTitleSchema = z.string().trim().min(1).max(2000);
const dueDateSchema = z.iso.date().nullable();

const createTaskSchema = z
  .object({
    title: taskTitleSchema,
    dueDate: dueDateSchema,
  })
  .strict();

const updateTaskSchema = z
  .object({
    title: taskTitleSchema.optional(),
    dueDate: dueDateSchema.optional(),
    completed: z.boolean().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0);

const importTasksSchema = z
  .object({
    tasks: z
      .array(
        z
          .object({
            legacyId: z.string().trim().min(1).max(128),
            title: taskTitleSchema,
            dueDate: dueDateSchema,
            completed: z.boolean(),
            createdAt: z.iso.datetime(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();

function logTaskFailure(operation: string, error: unknown) {
  const rawCode =
    typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined;

  console.error("Task database operation failed.", {
    operation,
    errorClass: error instanceof Error ? error.name : "NonError",
    ...(typeof rawCode === "string" && /^[0-9A-Z]{5}$/.test(rawCode)
      ? { databaseCode: rawCode }
      : {}),
  });
}

tasks.get("/", async (c) => {
  try {
    return c.json({ tasks: await getFamilyTasks() });
  } catch (error) {
    logTaskFailure("list", error);
    return c.json({ error: "Unable to load tasks." }, 500);
  }
});

tasks.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const input = createTaskSchema.safeParse(body);
  if (!input.success) {
    return c.json({ error: "Please provide a valid task title and due date." }, 400);
  }

  try {
    return c.json({ task: await createFamilyTask(input.data) }, 201);
  } catch (error) {
    logTaskFailure("create", error);
    return c.json({ error: "Unable to save the task." }, 500);
  }
});

tasks.post("/import-legacy", async (c) => {
  const body = await c.req.json().catch(() => null);
  const input = importTasksSchema.safeParse(body);
  if (!input.success) {
    return c.json({ error: "Please provide valid legacy tasks." }, 400);
  }

  try {
    await importFamilyTasks(input.data.tasks);
    return c.json({ imported: true });
  } catch (error) {
    logTaskFailure("import", error);
    return c.json({ error: "Unable to migrate saved tasks." }, 500);
  }
});

tasks.patch("/:id", async (c) => {
  const id = taskIdSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "Invalid task ID." }, 400);

  const body = await c.req.json().catch(() => null);
  const input = updateTaskSchema.safeParse(body);
  if (!input.success) {
    return c.json({ error: "Please provide valid task changes." }, 400);
  }

  try {
    const task = await updateFamilyTask(id.data, input.data);
    if (!task) return c.json({ error: "Task not found." }, 404);
    return c.json({ task });
  } catch (error) {
    logTaskFailure("update", error);
    return c.json({ error: "Unable to update the task." }, 500);
  }
});

tasks.delete("/:id", async (c) => {
  const id = taskIdSchema.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "Invalid task ID." }, 400);

  try {
    const deleted = await deleteFamilyTask(id.data);
    if (!deleted) return c.json({ error: "Task not found." }, 404);
    return c.json({ message: "Task deleted successfully." });
  } catch (error) {
    logTaskFailure("delete", error);
    return c.json({ error: "Unable to delete the task." }, 500);
  }
});

export default tasks;
