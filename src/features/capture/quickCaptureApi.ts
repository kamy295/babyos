import type { NoteCategory } from "../../types/notes";

export type AiSuggestedEvent = {
  content: string;
  category: NoteCategory;
  eventDate: string | null;
  startTime: string | null;
  endTime: string | null;
  quantity: number | null;
  unit: string | null;
  durationMinutes: number | null;
};

export async function processQuickCapture(
  text: string,
): Promise<AiSuggestedEvent[]> {
  const response = await fetch("/api/ai/quick-capture", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : "Unable to process your note.";

    throw new Error(error);
  }

  if (
    typeof data !== "object" ||
    data === null ||
    !("events" in data) ||
    !Array.isArray(data.events) ||
    data.events.length === 0
  ) {
    throw new Error("No events were identified. Please try again.");
  }

  return data.events as AiSuggestedEvent[];
}

export async function saveQuickCapture(
  content: string,
  events: AiSuggestedEvent[],
): Promise<void> {
  const response = await fetch("/api/captures/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, events }),
  });

  if (!response.ok) {
    const result: unknown = await response.json().catch(() => null);

    const error =
      typeof result === "object" &&
      result !== null &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : "Unable to save your capture.";

    throw new Error(error);
  }
}
