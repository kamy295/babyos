import { afterEach, describe, expect, it, vi } from "vitest";
import {
  processQuickCapture,
  saveQuickCapture,
  type AiSuggestedEvent,
} from "./quickCaptureApi";

const mockEvent: AiSuggestedEvent = {
  content: "Baby slept for two hours",
  category: "Sleep",
  eventDate: "2026-11-23",
  startTime: "13:00",
  endTime: "15:00",
  quantity: null,
  unit: null,
  durationMinutes: 120,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("processQuickCapture", () => {
  it("sends the note and returns suggested events", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ events: [mockEvent] }), { status: 200 }),
      );

    vi.stubGlobal("fetch", fetchMock);

    const result = await processQuickCapture("Baby slept for two hours");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai/quick-capture",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Baby slept for two hours" }),
      }),
    );

    expect(result).toEqual([mockEvent]);
  });

  it("throws the server error when processing fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Gemini API unavailable" }), {
          status: 502,
        }),
      ),
    );

    await expect(processQuickCapture("Baby slept")).rejects.toThrow(
      "Gemini API unavailable",
    );
  });

  it("throws when no events are identified", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ events: [] }), { status: 200 }),
        ),
    );

    await expect(processQuickCapture("Random note")).rejects.toThrow(
      "No events were identified. Please try again.",
    );
  });

  it("propagates network errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network unavailable")),
    );

    await expect(processQuickCapture("Baby slept")).rejects.toThrow(
      "Network unavailable",
    );
  });

  it("handles malformed JSON responses with a useful error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("not valid json", { status: 200 })),
    );

    await expect(processQuickCapture("Baby slept")).rejects.toThrow(
      "No events were identified. Please try again.",
    );
  });

  it("rejects responses without an events array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ result: "success" }), {
          status: 200,
        }),
      ),
    );

    await expect(processQuickCapture("Baby slept")).rejects.toThrow(
      "No events were identified. Please try again.",
    );
  });
});

describe("saveQuickCapture", () => {
  it("sends the confirmed capture to the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ capture: { id: "capture-1" } }), {
        status: 201,
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      saveQuickCapture("Baby slept", [mockEvent]),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/api/captures/confirm",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Baby slept",
          events: [mockEvent],
        }),
      }),
    );
  });

  it("throws the server error when saving fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ error: "Unable to save your capture." }),
            { status: 500 },
          ),
        ),
    );

    await expect(saveQuickCapture("Baby slept", [mockEvent])).rejects.toThrow(
      "Unable to save your capture.",
    );
  });
});
