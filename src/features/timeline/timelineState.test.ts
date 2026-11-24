import { describe, expect, it } from "vitest";
import {
  getTimelineFallbackPage,
  INITIAL_TIMELINE_VIEW_STATE,
  reduceTimelineView,
} from "./timelineState";

describe("timeline view state", () => {
  it("starts on page one with the default page size of ten", () => {
    expect(INITIAL_TIMELINE_VIEW_STATE).toMatchObject({
      category: "All",
      page: 1,
      pageSize: 10,
    });
  });

  it("resets the page on category changes and preserves the selected page size", () => {
    const state = {
      ...INITIAL_TIMELINE_VIEW_STATE,
      page: 4,
      pageSize: 20 as const,
    };

    expect(
      reduceTimelineView(state, { type: "category-changed", category: "Sleep" }),
    ).toEqual({ ...state, category: "Sleep", page: 1 });
  });

  it("resets to page one when page size changes", () => {
    const state = { ...INITIAL_TIMELINE_VIEW_STATE, page: 3 };

    expect(
      reduceTimelineView(state, { type: "page-size-changed", pageSize: 50 }),
    ).toEqual({ ...state, page: 1, pageSize: 50 });
  });

  it("preserves the page size when navigating and clamps after a last-page deletion", () => {
    const state = { ...INITIAL_TIMELINE_VIEW_STATE, page: 5, pageSize: 5 as const };
    const pageChanged = reduceTimelineView(state, {
      type: "page-changed",
      page: 4,
    });

    expect(pageChanged).toEqual({ ...state, page: 4 });
    expect(
      reduceTimelineView(pageChanged, { type: "page-clamped", page: 3 }),
    ).toEqual({ ...state, page: 3 });
  });

  it("moves to an earlier page when deletion leaves the current page empty", () => {
    expect(getTimelineFallbackPage(3, 3, 21, 0)).toBe(2);
    expect(getTimelineFallbackPage(3, 2, 20, 0)).toBe(2);
    expect(getTimelineFallbackPage(1, 0, 0, 0)).toBeNull();
  });

  it("refreshes the current page without resetting its filter or size", () => {
    const state = {
      ...INITIAL_TIMELINE_VIEW_STATE,
      category: "Feeding" as const,
      page: 2,
      pageSize: 15 as const,
    };

    expect(reduceTimelineView(state, { type: "refresh" })).toEqual({
      ...state,
      refreshVersion: 1,
    });
  });
});
