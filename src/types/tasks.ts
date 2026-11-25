export type Task = {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  createdAt: string;
  legacyId?: string;
};

export type TaskFilter = "All" | "Pending" | "Completed";

export const TASK_FILTERS: TaskFilter[] = ["All", "Pending", "Completed"];
