import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { FamilyEvent } from "../../types/notes";
import EventCard from "./EventCard";

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
  recordedAt: "2026-11-25T08:00:00.000Z",
  createdAt: "2026-11-25T08:00:00.000Z",
};

const props: Omit<ComponentProps<typeof EventCard>, "event"> = {
  onDelete: vi.fn(),
  onEdit: vi.fn(),
  isDeleting: false,
};

describe("EventCard media links", () => {
  it("shows a secure external Open memories link when a URL exists", () => {
    const markup = renderToStaticMarkup(
      createElement(EventCard, {
        ...props,
        event: { ...event, mediaUrl: "https://photos.example/memory" },
      }),
    );

    expect(markup).toContain("Open memories");
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain('rel="noopener noreferrer"');
    expect(markup).toContain('href="https://photos.example/memory"');
  });

  it("shows no memory link for null, absent or unsafe URLs", () => {
    for (const mediaUrl of [null, undefined, "javascript:alert(1)"]) {
      const markup = renderToStaticMarkup(
        createElement(EventCard, {
          ...props,
          event: { ...event, mediaUrl },
        }),
      );
      expect(markup).not.toContain("Open memories");
    }
  });
});
