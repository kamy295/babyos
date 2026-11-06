import type { FamilyNote } from "../../types/notes";
import type { Task } from "../../types/tasks";

export function answerQuestion(
  question: string,
  notes: FamilyNote[],
  tasks: Task[],
): string {
  const query = question.toLowerCase().trim();

  if (!query) {
    return "Please enter a question.";
  }

  // Pending tasks
  if (
    query.includes("pending task") ||
    query.includes("tasks pending") ||
    query.includes("to do")
  ) {
    const pendingTasks = tasks.filter((task) => !task.completed);

    if (pendingTasks.length === 0) {
      return "You don't have any pending tasks.";
    }

    return `You have ${pendingTasks.length} pending tasks:\n${pendingTasks
      .map((task) => `• ${task.title}`)
      .join("\n")}`;
  }

  // Completed tasks
  if (query.includes("completed task") || query.includes("finished task")) {
    const completedTasks = tasks.filter((task) => task.completed);

    if (completedTasks.length === 0) {
      return "You haven't completed any tasks yet.";
    }

    return `Completed tasks:\n${completedTasks
      .map((task) => `• ${task.title}`)
      .join("\n")}`;
  }

  // Latest sleep note
  if (query.includes("sleep")) {
    const latestSleep = notes.find((note) => note.category === "Sleep");

    if (!latestSleep) {
      return "I couldn't find any saved sleep records.";
    }

    return `Your latest saved sleep note:\n"${latestSleep.content}"\nRecorded on: ${latestSleep.createdAt}`;
  }

  // Latest feeding note
  if (
    query.includes("eat") ||
    query.includes("food") ||
    query.includes("feeding") ||
    query.includes("meal")
  ) {
    const latestFeeding = notes.find((note) => note.category === "Feeding");

    if (!latestFeeding) {
      return "I couldn't find any saved feeding records.";
    }

    return `Your latest saved feeding note:\n"${latestFeeding.content}"\nRecorded on: ${latestFeeding.createdAt}`;
  }

  // Recent notes
  if (query.includes("recent notes") || query.includes("latest notes")) {
    if (notes.length === 0) {
      return "There are no saved notes yet.";
    }

    return `Your latest notes:\n${notes
      .slice(0, 5)
      .map((note) => `• [${note.category}] ${note.content}`)
      .join("\n")}`;
  }

  return "I couldn't find an answer to that question in your saved information yet.";
}
