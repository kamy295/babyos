import type { NoteCategory } from "../../types/notes";
import { normalizeOptionalHttpUrl } from "../../utils/mediaUrl";

export type AiSuggestedEvent = {
  content: string;
  category: NoteCategory;
  eventDate: string | null;
  startTime: string | null;
  endTime: string | null;
  quantity: number | null;
  unit: string | null;
  durationMinutes: number | null;
  mediaUrl?: string | null;
};

export type QuickCaptureDraftEvent = AiSuggestedEvent & {
  mediaUrl?: string | null;
};

export function updateQuickCaptureDraftEvent(
  events: QuickCaptureDraftEvent[],
  index: number,
  field: "content" | "category" | "mediaUrl",
  value: string,
): QuickCaptureDraftEvent[] {
  return events.map((event, currentIndex) => {
    if (currentIndex !== index) return event;
    if (field === "content") return { ...event, content: value };
    if (field === "category") return { ...event, category: value as NoteCategory };
    return { ...event, mediaUrl: value };
  });
}

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
  events: QuickCaptureDraftEvent[],
): Promise<void> {
  const eventsWithMediaUrls = events.map((event) => ({
    ...event,
    mediaUrl: normalizeOptionalHttpUrl(event.mediaUrl ?? ""),
  }));

  const response = await fetch("/api/captures/confirm", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content, events: eventsWithMediaUrls }),
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
