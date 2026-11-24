import type { TimelineFilter } from "../../types/notes";
import {
  DEFAULT_TIMELINE_PAGE_SIZE,
  type TimelinePageSize,
} from "./timelineApi";

export type TimelineViewState = {
  category: TimelineFilter;
  page: number;
  pageSize: TimelinePageSize;
  refreshVersion: number;
};

export const INITIAL_TIMELINE_VIEW_STATE: TimelineViewState = {
  category: "All",
  page: 1,
  pageSize: DEFAULT_TIMELINE_PAGE_SIZE,
  refreshVersion: 0,
};

export type TimelineViewAction =
  | { type: "category-changed"; category: TimelineFilter }
  | { type: "page-changed"; page: number }
  | { type: "page-size-changed"; pageSize: TimelinePageSize }
  | { type: "page-clamped"; page: number }
  | { type: "refresh" };

export function getTimelineFallbackPage(
  page: number,
  totalPages: number,
  totalRecords: number,
  pageEventCount: number,
): number | null {
  const lastValidPage = Math.max(1, totalPages);
  if (page > lastValidPage) return lastValidPage;
  if (page > 1 && pageEventCount === 0 && totalRecords > 0) {
    return Math.min(page - 1, lastValidPage);
  }
  return null;
}

export function reduceTimelineView(
  state: TimelineViewState,
  action: TimelineViewAction,
): TimelineViewState {
  switch (action.type) {
    case "category-changed":
      return action.category === state.category
        ? state
        : { ...state, category: action.category, page: 1 };
    case "page-changed":
      return { ...state, page: Math.max(1, action.page) };
    case "page-size-changed":
      return { ...state, page: 1, pageSize: action.pageSize };
    case "page-clamped":
      return { ...state, page: Math.max(1, action.page) };
    case "refresh":
      return { ...state, refreshVersion: state.refreshVersion + 1 };
  }
}
