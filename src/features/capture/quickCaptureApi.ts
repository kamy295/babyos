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

type QuickCaptureResponse = {
  events: AiSuggestedEvent[];
  error?: string;
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

  const data = (await response.json()) as QuickCaptureResponse;

  if (!response.ok) {
    throw new Error(data.error ?? "Unable to process your note.");
  }

  if (!Array.isArray(data.events) || data.events.length === 0) {
    throw new Error("No events were identified. Please try again.");
  }

  return data.events;
}

export async function saveQuickCapture(
  content: string,
  events: AiSuggestedEvent[],
): Promise<void> {
  const response = await fetch("http://localhost:3000/api/captures/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, events }),
  });

  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error ?? "Unable to save your capture.");
  }
}
