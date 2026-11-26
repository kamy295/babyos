const { generateContent, getBabyEvents, getFamilyNotes } = vi.hoisted(() => ({
  generateContent: vi.fn(),
  getBabyEvents: vi.fn(),
  getFamilyNotes: vi.fn(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
  Type: {
    OBJECT: "OBJECT",
    ARRAY: "ARRAY",
    STRING: "STRING",
    NUMBER: "NUMBER",
    BOOLEAN: "BOOLEAN",
  },
}));

vi.mock("../repositories/notes.repository", () => ({ getFamilyNotes }));
vi.mock("../repositories/events.repository", () => ({ getBabyEvents }));

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import aiRoutes from "./ai";

const app = new Hono().route("/api/ai", aiRoutes);

const postJson = (path: string, body: unknown) =>
  app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const savedNotes = [
  {
    id: "note-uuid-1",
    content: "Dhruv slept after lunch.",
    createdAt: "2026-11-23T10:00:00.000Z",
  },
];

const savedEvents = [
  {
    id: "event-uuid-1",
    source_note_id: "note-uuid-1",
    content: "Dhruv slept for 90 minutes",
    category: "Sleep",
    event_date: "2026-11-23",
    end_date: "2026-11-23",
    start_time: "13:00:00",
    end_time: "14:30:00",
    quantity: null,
    unit: null,
    duration_minutes: 90,
    recorded_at: "2026-11-23T15:00:00.000Z",
    created_at: "2026-11-23T15:00:00.000Z",
  },
  {
    id: "event-uuid-2",
    source_note_id: null,
    content: "Feeding amount not recorded",
    category: "Feeding",
    event_date: null,
    end_date: null,
    start_time: null,
    end_time: null,
    quantity: null,
    unit: null,
    duration_minutes: null,
    recorded_at: "2026-11-24T08:00:00.000Z",
    created_at: "2026-11-24T08:00:00.000Z",
  },
];

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "test-api-key");
  generateContent.mockReset();
  getFamilyNotes.mockReset().mockResolvedValue(savedNotes);
  getBabyEvents.mockReset().mockResolvedValue(savedEvents);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/ai/quick-capture", () => {
  it("returns 400 when the input is invalid", async () => {
    const response = await postJson("/api/ai/quick-capture", { text: "" });

    expect(response.status).toBe(400);
  });

  it("returns 500 when the Gemini API key is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    const response = await postJson("/api/ai/quick-capture", {
      text: "Baby slept from 1 PM to 3 PM",
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Gemini API key is not configured.",
    });
  });

  it("returns events when Gemini successfully processes the note", async () => {
    const events = [
      {
        content: "Baby slept from 1 PM to 3 PM",
        category: "Sleep",
        eventDate: null,
        startTime: "13:00",
        endTime: "15:00",
        quantity: null,
        unit: null,
        durationMinutes: 120,
      },
    ];

    generateContent.mockResolvedValue({ text: JSON.stringify({ events }) });

    const response = await postJson("/api/ai/quick-capture", {
      text: "Baby slept from 1 PM to 3 PM",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ events });
    expect(generateContent).toHaveBeenCalledOnce();
  });

  it("returns 502 when Gemini returns malformed JSON", async () => {
    generateContent.mockResolvedValue({ text: "This is not valid JSON" });

    const response = await postJson("/api/ai/quick-capture", {
      text: "Baby slept from 1 PM to 3 PM",
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to process your note right now. Please try again.",
    });
  });

  it("returns 502 when Gemini returns an invalid event structure", async () => {
    generateContent.mockResolvedValue({
      text: JSON.stringify({
        events: [{ content: "Baby slept", category: "InvalidCategory" }],
      }),
    });

    const response = await postJson("/api/ai/quick-capture", {
      text: "Baby slept from 1 PM to 3 PM",
    });

    expect(response.status).toBe(502);
  });
});

describe("POST /api/ai/ask", () => {
  it("rejects an empty question", async () => {
    const response = await postJson("/api/ai/ask", {
      question: "",
      tasks: [],
    });

    expect(response.status).toBe(400);
    expect(getFamilyNotes).not.toHaveBeenCalled();
    expect(getBabyEvents).not.toHaveBeenCalled();
  });

  it("rejects invalid task data", async () => {
    const response = await postJson("/api/ai/ask", {
      question: "What are my tasks?",
      tasks: [{ id: "not-a-number", completed: "no" }],
    });

    expect(response.status).toBe(400);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("rejects browser-supplied notes instead of treating them as context", async () => {
    const response = await postJson("/api/ai/ask", {
      question: "When did the baby sleep?",
      notes: [{ id: 1, content: "Untrusted note" }],
      tasks: [],
    });

    expect(response.status).toBe(400);
    expect(getFamilyNotes).not.toHaveBeenCalled();
    expect(getBabyEvents).not.toHaveBeenCalled();
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("returns 500 when the Gemini API key is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    const response = await postJson("/api/ai/ask", {
      question: "When did the baby last sleep?",
      tasks: [],
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Gemini API key is not configured.",
    });
    expect(getFamilyNotes).not.toHaveBeenCalled();
    expect(getBabyEvents).not.toHaveBeenCalled();
  });

  it("retrieves persisted notes and events and sends them with tasks to Gemini", async () => {
    generateContent.mockResolvedValue({
      text: "Dhruv slept for 90 minutes on November 23.",
    });
    const tasks = [
      {
        id: "10000000-0000-4000-8000-000000000001",
        title: "Buy diapers",
        dueDate: "2026-11-25",
        completed: false,
        createdAt: "2026-11-24T08:00:00.000Z",
      },
    ];

    const response = await postJson("/api/ai/ask", {
      question: "When did Dhruv last sleep?",
      tasks,
    });

    expect(getFamilyNotes).toHaveBeenCalledOnce();
    expect(getBabyEvents).toHaveBeenCalledOnce();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      answer: "Dhruv slept for 90 minutes on November 23.",
    });

    const prompt = generateContent.mock.calls[0]?.[0].contents as string;
    expect(prompt).toContain("Original family notes (JSON)");
    expect(prompt).toContain('"id":"note-uuid-1"');
    expect(prompt).toContain("Structured baby events (JSON)");
    expect(prompt).toContain('"sourceNoteId":"note-uuid-1"');
    expect(prompt).toContain('"sourceNoteId":null');
    expect(prompt).toContain('"eventDate":"2026-11-23"');
    expect(prompt).toContain('"endDate":"2026-11-23"');
    expect(prompt).toContain('"startTime":"13:00:00"');
    expect(prompt).toContain('"durationMinutes":90');
    expect(prompt).toContain('"recordedAt":"2026-11-23T15:00:00.000Z"');
    expect(prompt).toContain('"eventDate":null');
    expect(prompt).toContain("Tasks (JSON)");
    expect(prompt).toContain('"title":"Buy diapers"');
    expect(prompt).toContain(
      "Answer the parent's actual question directly in warm, natural conversational language",
    );
    expect(prompt).toContain(
      "Use simple, everyday words and short, natural sentences",
    );
    expect(prompt).toContain(
      "Avoid unnecessary headings, bullet points, and report-like structure",
    );
    expect(prompt).toContain("Do not expose database field names, record IDs, timestamps");
    expect(prompt).toContain("I don't have the exact time recorded.");
    expect(prompt).toContain(
      "Never invent events, dates, times, quantities, durations, task statuses, or other details",
    );
    expect(prompt).toContain(
      "Structured event fields are authoritative for recorded event details",
    );
    expect(prompt).toContain("recordCreatedAt and recordedAt are record timestamps");
    expect(prompt).toContain("Identify records that may be duplicates");
    expect(prompt).toContain(
      "do not count them as separate events without supporting evidence",
    );
    expect(prompt).toContain(
      "Explain conflicting or ambiguous records instead of arbitrarily choosing one",
    );
    expect(prompt).toContain("Do not merge or discard records");
  });

  it("returns a safe server error and skips Gemini when note retrieval fails", async () => {
    const databaseError = Object.assign(
      new Error("Sensitive database host and query details"),
      { code: "42501", details: "Private database detail" },
    );
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    getFamilyNotes.mockRejectedValue(databaseError);

    const response = await postJson("/api/ai/ask", {
      question: "When did the baby sleep?",
      tasks: [],
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to retrieve saved family information right now.",
    });
    expect(getBabyEvents).toHaveBeenCalledOnce();
    expect(generateContent).not.toHaveBeenCalled();
    expect(errorLog).toHaveBeenCalledWith(
      "Ask BabyOS persisted data retrieval failed.",
      { source: "family notes", diagnostic: "42501" },
    );
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(
      "Sensitive database host and query details",
    );
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(
      "Private database detail",
    );
  });

  it("returns a safe server error and skips Gemini when event retrieval fails", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    getBabyEvents.mockRejectedValue(new Error("Sensitive database detail"));

    const response = await postJson("/api/ai/ask", {
      question: "When did the baby sleep?",
      tasks: [],
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to retrieve saved family information right now.",
    });
    expect(getFamilyNotes).toHaveBeenCalledOnce();
    expect(generateContent).not.toHaveBeenCalled();
    expect(errorLog).toHaveBeenCalledWith(
      "Ask BabyOS persisted data retrieval failed.",
      { source: "baby events", diagnostic: "Error" },
    );
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(
      "Sensitive database detail",
    );
  });

  it.each(["", "   ", undefined])(
    "returns 502 when Gemini returns an empty/invalid answer (%s)",
    async (text) => {
      generateContent.mockResolvedValue({ text });

      const response = await postJson("/api/ai/ask", {
        question: "When did the baby sleep?",
        tasks: [],
      });

      expect(response.status).toBe(502);
      await expect(response.json()).resolves.toEqual({
        error: "Unable to answer your question right now. Please try again.",
      });
    },
  );

  it("returns 502 when Gemini request fails", async () => {
    generateContent.mockRejectedValue(new Error("Gemini service unavailable"));

    const response = await postJson("/api/ai/ask", {
      question: "When did the baby sleep?",
      tasks: [],
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to answer your question right now. Please try again.",
    });
  });
});
