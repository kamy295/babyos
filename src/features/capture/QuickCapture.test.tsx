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
            startTime: null,
            endTime: null,
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
    expect(markup).toContain("Paste a Google Drive, Photos or other link");
    expect(markup).not.toContain("required=");
  });
});
