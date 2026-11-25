const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export type TaskDueDateDisplay = {
  text: string;
  overdue: boolean;
};

function dateOrdinal(year: number, month: number, day: number): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return Math.floor(date.getTime() / MILLISECONDS_PER_DAY);
}

export function getTaskDueDateDisplay(
  dueDate: string,
  completed: boolean,
  now = new Date(),
): TaskDueDateDisplay | null {
  if (!dueDate) return null;

  const [year, month, day] = dueDate.split("-").map(Number);
  if (!year || !month || !day) return { text: `Due: ${dueDate}`, overdue: false };

  const localDueDate = new Date(0);
  localDueDate.setFullYear(year, month - 1, day);
  localDueDate.setHours(12, 0, 0, 0);
  if (
    localDueDate.getFullYear() !== year ||
    localDueDate.getMonth() !== month - 1 ||
    localDueDate.getDate() !== day
  ) {
    return { text: `Due: ${dueDate}`, overdue: false };
  }

  const dateText = localDueDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const daysOverdue =
    dateOrdinal(now.getFullYear(), now.getMonth() + 1, now.getDate()) -
    dateOrdinal(year, month, day);

  if (completed || daysOverdue < 0) {
    return { text: `Due: ${dueDate}`, overdue: false };
  }
  if (daysOverdue === 0) return { text: "Due today", overdue: false };

  return {
    text: `${dateText} · ${daysOverdue} ${daysOverdue === 1 ? "day" : "days"} overdue`,
    overdue: true,
  };
}
