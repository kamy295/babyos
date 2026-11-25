import { supabase } from "../lib/supabase";

export type TaskRecord = {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  createdAt: string;
  legacyId?: string;
};

export type CreateTaskInput = {
  title: string;
  dueDate: string | null;
};

export type UpdateTaskInput = {
  title?: string;
  dueDate?: string | null;
  completed?: boolean;
};

export type ImportLegacyTaskInput = CreateTaskInput & {
  legacyId: string;
  completed: boolean;
  createdAt: string;
};

function getTaskContext() {
  const familyId = process.env.BABYOS_DEV_FAMILY_ID;
  const babyId = process.env.BABYOS_DEV_BABY_ID;

  if (!familyId || !babyId) {
    throw new Error("Development family or baby ID is not configured.");
  }

  return { familyId, babyId };
}

function mapTask(row: {
  id: string;
  title: string;
  due_date: string | null;
  completed: boolean;
  created_at: string;
  legacy_id: string | null;
}): TaskRecord {
  return {
    id: row.id,
    title: row.title,
    dueDate: row.due_date ?? "",
    completed: row.completed,
    createdAt: row.created_at,
    ...(row.legacy_id ? { legacyId: row.legacy_id } : {}),
  };
}

const TASK_COLUMNS = "id, title, due_date, completed, created_at, legacy_id";

export async function getFamilyTasks(): Promise<TaskRecord[]> {
  const { familyId } = getTaskContext();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_COLUMNS)
    .eq("family_id", familyId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (error) throw error;
  return data.map(mapTask);
}

export async function createFamilyTask(
  input: CreateTaskInput,
): Promise<TaskRecord> {
  const { familyId, babyId } = getTaskContext();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      family_id: familyId,
      baby_id: babyId,
      title: input.title,
      due_date: input.dueDate,
      completed: false,
      completed_at: null,
    })
    .select(TASK_COLUMNS)
    .single();

  if (error) throw error;
  return mapTask(data);
}

export async function updateFamilyTask(
  taskId: string,
  input: UpdateTaskInput,
): Promise<TaskRecord | null> {
  const { familyId } = getTaskContext();
  const update: {
    title?: string;
    due_date?: string | null;
    completed?: boolean;
    completed_at?: string | null;
    updated_at: string;
  } = { updated_at: new Date().toISOString() };

  if (input.title !== undefined) update.title = input.title;
  if (input.dueDate !== undefined) update.due_date = input.dueDate;
  if (input.completed !== undefined) {
    update.completed = input.completed;
    update.completed_at = input.completed ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", taskId)
    .eq("family_id", familyId)
    .select(TASK_COLUMNS)
    .maybeSingle();

  if (error) throw error;
  return data ? mapTask(data) : null;
}

export async function deleteFamilyTask(taskId: string): Promise<boolean> {
  const { familyId } = getTaskContext();
  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("family_id", familyId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

export async function importFamilyTasks(
  tasks: ImportLegacyTaskInput[],
): Promise<void> {
  const { familyId, babyId } = getTaskContext();
  const rows = tasks.map((task) => ({
    family_id: familyId,
    baby_id: babyId,
    legacy_id: task.legacyId,
    title: task.title,
    due_date: task.dueDate,
    completed: task.completed,
    completed_at: task.completed ? task.createdAt : null,
    created_at: task.createdAt,
  }));

  const { error } = await supabase.from("tasks").upsert(rows, {
    onConflict: "family_id,legacy_id",
    ignoreDuplicates: true,
  });

  if (error) throw error;
}
