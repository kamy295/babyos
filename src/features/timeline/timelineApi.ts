import type { TimelineFilter } from "../../types/notes";

export const TIMELINE_PAGE_SIZES = [5, 10, 15, 20, 50] as const;
export type TimelinePageSize = (typeof TIMELINE_PAGE_SIZES)[number];
export const DEFAULT_TIMELINE_PAGE_SIZE: TimelinePageSize = 10;

export type TimelinePagination = {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
};

export type TimelinePageResponse<T> = {
  events: T[];
  pagination: TimelinePagination;
};

export function buildTimelinePageUrl(
  page: number,
  pageSize: TimelinePageSize,
  category: TimelineFilter,
): string {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  if (category !== "All") params.set("category", category);
  return `http://localhost:3000/api/events?${params.toString()}`;
}

export function createTimelinePageLoader(fetcher: typeof fetch = fetch) {
  let latestRequestId = 0;

  return async function loadTimelinePage<T>(
    url: string,
    signal: AbortSignal,
  ): Promise<
    { status: "success"; data: TimelinePageResponse<T> } | { status: "stale" }
  > {
    const requestId = ++latestRequestId;

    try {
      const response = await fetcher(url, { signal });
      if (!response.ok) throw new Error("Unable to load timeline events.");

      const data = (await response.json()) as TimelinePageResponse<T>;
      if (signal.aborted || requestId !== latestRequestId) {
        return { status: "stale" };
      }

      return { status: "success", data };
    } catch (error) {
      if (signal.aborted || requestId !== latestRequestId) {
        return { status: "stale" };
      }
      throw error;
    }
  };
}
