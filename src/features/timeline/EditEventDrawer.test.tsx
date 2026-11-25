import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { FamilyEvent } from "../../types/notes";
import EditEventDrawer from "./EditEventDrawer";

const event: FamilyEvent = {
  id: "event-1",
  sourceNoteId: "note-1",
  isTrackerSession: false,
  content: "Baby's first steps",
  category: "Milestone",
  eventDate: "2026-11-25",
  endDate: null,
  startTime: null,
  endTime: null,
  quantity: null,
  unit: null,
  durationMinutes: null,
  mediaUrl: "https://drive.google.com/memory",
  recordedAt: "2026-11-25T08:00:00.000Z",
  createdAt: "2026-11-25T08:00:00.000Z",
};

const baseProps: ComponentProps<typeof EditEventDrawer> = {
  event,
  isSaving: false,
  onClose: vi.fn(),
  onSave: vi.fn(),
};

describe("EditEventDrawer media URL field", () => {
  it("shows the existing link in an optional editable field", () => {
    const markup = renderToStaticMarkup(
      createElement(EditEventDrawer, baseProps),
    );

    expect(markup).toContain("Photos &amp; Videos (optional)");
    expect(markup).toContain('type="url"');
    expect(markup).toContain("https://drive.google.com/memory");
    expect(markup).not.toMatch(/<input[^>]*type="url"[^>]*required/);
  });
});
