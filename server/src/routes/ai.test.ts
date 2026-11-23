const { generateContent } = vi.hoisted(() => ({
  generateContent: vi.fn(),
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

import { afterEach, describe, expect, it, vi } from "vitest";
import { Hono } from "hono";
import aiRoutes from "./ai";

const app = new Hono().route("/api/ai", aiRoutes);

const postJson = (path: string, body: unknown) =>
  app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

afterEach(() => {
  vi.unstubAllEnvs();
  generateContent.mockReset();
});

describe("POST /api/ai/quick-capture", () => {
  it("returns 400 when the input is invalid", async () => {
    const response = await postJson("/api/ai/quick-capture", {
      text: "",
    });

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
    vi.stubEnv("GEMINI_API_KEY", "test-api-key");

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

    generateContent.mockResolvedValue({
      text: JSON.stringify({ events }),
    });

    const response = await postJson("/api/ai/quick-capture", {
      text: "Baby slept from 1 PM to 3 PM",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ events });
    expect(generateContent).toHaveBeenCalledOnce();
  });

  it("returns 502 when Gemini returns malformed JSON", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-api-key");

    generateContent.mockResolvedValue({
      text: "This is not valid JSON",
    });

    const response = await postJson("/api/ai/quick-capture", {
      text: "Baby slept from 1 PM to 3 PM",
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to process your note right now. Please try again.",
    });
  });

  it("returns 502 when Gemini returns an invalid event structure", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-api-key");

    generateContent.mockResolvedValue({
      text: JSON.stringify({
        events: [
          {
            content: "Baby slept",
            category: "InvalidCategory",
          },
        ],
      }),
    });

    const response = await postJson("/api/ai/quick-capture", {
      text: "Baby slept from 1 PM to 3 PM",
    });

    expect(response.status).toBe(502);
  });
});

describe("POST /api/ai/ask", () => {
  it("returns 400 when the input is invalid", async () => {
    const response = await postJson("/api/ai/ask", {
      question: "",
      notes: [],
      tasks: [],
    });

    expect(response.status).toBe(400);
  });

  it("returns 500 when the Gemini API key is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");

    const response = await postJson("/api/ai/ask", {
      question: "When did the baby last sleep?",
      notes: [],
      tasks: [],
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Gemini API key is not configured.",
    });
  });

  it("returns an answer when Gemini successfully processes the question", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-api-key");

    generateContent.mockResolvedValue({
      text: "Your baby last slept from 1 PM to 3 PM.",
    });

    const response = await postJson("/api/ai/ask", {
      question: "When did the baby last sleep?",
      notes: [
        {
          id: 1,
          content: "Baby slept from 1 PM to 3 PM",
          category: "Sleep",
          createdAt: "2026-11-23T13:00:00.000Z",
        },
      ],
      tasks: [],
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      answer: "Your baby last slept from 1 PM to 3 PM.",
    });
    expect(generateContent).toHaveBeenCalledOnce();
  });

  it("returns 502 when Gemini returns an empty answer", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-api-key");

    generateContent.mockResolvedValue({
      text: "",
    });

    const response = await postJson("/api/ai/ask", {
      question: "When did the baby last sleep?",
      notes: [],
      tasks: [],
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to answer your question right now. Please try again.",
    });
  });

  it("returns 502 when Gemini request fails", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-api-key");

    generateContent.mockRejectedValue(new Error("Gemini service unavailable"));

    const response = await postJson("/api/ai/ask", {
      question: "When did the baby last sleep?",
      notes: [],
      tasks: [],
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to answer your question right now. Please try again.",
    });
  });
});
