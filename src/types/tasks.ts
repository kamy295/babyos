export type Task = {
  id: number;
  title: string;
  dueDate: string;
  completed: boolean;
  createdAt: string;
};

export type TaskFilter = "All" | "Pending" | "Completed";

export const TASK_FILTERS: TaskFilter[] = ["All", "Pending", "Completed"];
