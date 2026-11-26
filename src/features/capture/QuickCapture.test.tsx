import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import QuickCapture from "./QuickCapture";

const baseProps: ComponentProps<typeof QuickCapture> = {
  noteInput: "",
  draftEvents: [],
  isProcessingCapture: false,
  captureError: "",
  isSavingCapture: false,
  onNoteInputChange: vi.fn(),
  onAddNote: vi.fn(),
  onConfirmNote: vi.fn(),
  onDiscardDraft: vi.fn(),
  onUpdateDraftEvent: vi.fn(),
};

describe("Quick Capture media URL fields", () => {
  it("renders a separate optional link field for every extracted event", () => {
    const markup = renderToStaticMarkup(
      createElement(QuickCapture, {
        ...baseProps,
        draftEvents: [
          {
            content: "Baby slept",
            category: "Sleep",
            eventDate: null,
            startTime: "08:00",
            endTime: "09:30",
            quantity: null,
            unit: null,
            durationMinutes: null,
            mediaUrl: "https://drive.google.com/one",
          },
          {
            content: "Baby was fed",
            category: "Feeding",
            eventDate: null,
            startTime: null,
            endTime: null,
            quantity: null,
            unit: null,
            durationMinutes: null,
            mediaUrl: null,
          },
        ],
      }),
    );

    expect(markup.match(/Photos &amp; Videos \(optional\)/g)).toHaveLength(2);
    expect(markup).toContain("https://drive.google.com/one");
    expect(markup).toContain("8:00 AM");
    expect(markup).toContain("9:30 AM");
    expect(markup).toContain('value="08:00"');
    expect(markup).toContain('value="09:30"');
    expect(markup).toContain("Paste a Google Drive, Photos or other link");
    expect(markup).not.toContain("required=");
  });

  it("renders blank time inputs without fabricated time labels", () => {
    const markup = renderToStaticMarkup(
      createElement(QuickCapture, {
        ...baseProps,
        draftEvents: [
          {
            content: "Baby had breakfast",
            category: "Feeding",
            eventDate: null,
            startTime: null,
            endTime: null,
            quantity: null,
            unit: null,
            durationMinutes: null,
          },
        ],
      }),
    );

    expect(markup).toContain('aria-label="Start time for event 1"');
    expect(markup).toContain('aria-label="End time for event 1"');
    expect(markup).not.toContain("draft-time-display");
  });

  it.each([
    ["00:00", "12:00 AM"],
    ["12:00", "12:00 PM"],
  ])("formats valid boundary time %s as %s", (time, formatted) => {
    const markup = renderToStaticMarkup(
      createElement(QuickCapture, {
        ...baseProps,
        draftEvents: [
          {
            content: "Baby event",
            category: "General",
            eventDate: null,
            startTime: time,
            endTime: null,
            quantity: null,
            unit: null,
            durationMinutes: null,
          },
        ],
      }),
    );

    expect(markup).toContain(formatted);
  });

  it("does not show an invalid 24-hour time as a formatted time", () => {
    const markup = renderToStaticMarkup(
      createElement(QuickCapture, {
        ...baseProps,
        draftEvents: [
          {
            content: "Baby event",
            category: "General",
            eventDate: null,
            startTime: "25:00",
            endTime: null,
            quantity: null,
            unit: null,
            durationMinutes: null,
          },
        ],
      }),
    );

    expect(markup).not.toContain("draft-time-display");
  });
});
