import type { Task } from "../../types/tasks";

type AskBabyOSResponse = {
  answer: string;
  error?: string;
};

export async function askBabyOS(
  question: string,
  tasks: Task[],
): Promise<string> {
  const response = await fetch("/api/ai/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      tasks: tasks.map(({ id, title, dueDate, completed, createdAt }) => ({
        id,
        title,
        dueDate,
        completed,
        createdAt,
      })),
    }),
  });

  const data = (await response.json()) as AskBabyOSResponse;

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to get an answer right now.");
  }

  if (typeof data.answer !== "string" || !data.answer.trim()) {
    throw new Error("BabyOS couldn't generate an answer. Please try again.");
  }

  return data.answer;
}
