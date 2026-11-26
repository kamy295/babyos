import { afterEach, describe, expect, it, vi } from "vitest";
import {
  processQuickCapture,
  saveQuickCapture,
  updateQuickCaptureDraftEvent,
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
  mediaUrl: null,
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
      "/api/captures/confirm",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "Baby slept",
          events: [{ ...mockEvent, mediaUrl: null }],
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

  it("saves separate optional media URLs for multiple events and normalizes empty links", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ capture: { id: "capture-2" } }), {
        status: 201,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const events = [
      { ...mockEvent, mediaUrl: " https://drive.google.com/photo " },
      { ...mockEvent, category: "Feeding" as const, mediaUrl: "" },
    ];

    await saveQuickCapture("Two moments", events);

    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)).events).toEqual([
      { ...mockEvent, mediaUrl: "https://drive.google.com/photo" },
      { ...mockEvent, category: "Feeding", mediaUrl: null },
    ]);
  });

  it("rejects invalid or unsupported media URL protocols before sending", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      saveQuickCapture("Note", [{ ...mockEvent, mediaUrl: "ftp://example.com/file" }]),
    ).rejects.toThrow("Enter a valid HTTP or HTTPS URL.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves each event's link when content or category changes", () => {
    const drafts = [
      { ...mockEvent, mediaUrl: "https://drive.google.com/one" },
      { ...mockEvent, mediaUrl: "https://photos.google.com/two" },
    ];
    const contentEdited = updateQuickCaptureDraftEvent(drafts, 0, "content", "Updated");
    const categoryEdited = updateQuickCaptureDraftEvent(contentEdited, 0, "category", "Health");

    expect(categoryEdited[0]).toMatchObject({
      content: "Updated",
      category: "Health",
      mediaUrl: "https://drive.google.com/one",
    });
    expect(categoryEdited[1]?.mediaUrl).toBe("https://photos.google.com/two");
  });

  it("updates or clears event times in the draft while preserving other events", () => {
    const drafts = [
      { ...mockEvent, startTime: null, endTime: null },
      { ...mockEvent, startTime: "09:00", endTime: "10:00" },
    ];
    const withStart = updateQuickCaptureDraftEvent(drafts, 0, "startTime", "08:30");
    const withEnd = updateQuickCaptureDraftEvent(withStart, 0, "endTime", "09:15");
    const cleared = updateQuickCaptureDraftEvent(withEnd, 0, "startTime", "");

    expect(cleared[0]).toMatchObject({ startTime: null, endTime: "09:15" });
    expect(cleared[1]).toMatchObject({ startTime: "09:00", endTime: "10:00" });
  });

  it("includes edited times in the existing confirmation request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ capture: { id: "capture-3" } }), {
        status: 201,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const withStart = updateQuickCaptureDraftEvent(
      [mockEvent],
      0,
      "startTime",
      "08:30",
    );
    const withEnd = updateQuickCaptureDraftEvent(
      withStart,
      0,
      "endTime",
      "09:15",
    );

    await saveQuickCapture("Breakfast", withEnd);

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.events[0]).toMatchObject({
      startTime: "08:30",
      endTime: "09:15",
    });
  });

  it("uses the fallback message when the error response is malformed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({
          error: { message: "Database error" },
        }),
      }),
    );

    await expect(saveQuickCapture("Baby slept", [])).rejects.toThrow(
      "Unable to save your capture.",
    );
  });
});
