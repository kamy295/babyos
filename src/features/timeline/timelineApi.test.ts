import { describe, expect, it, vi } from "vitest";
import {
  buildTimelinePageUrl,
  createTimelinePageLoader,
  DEFAULT_TIMELINE_PAGE_SIZE,
  TIMELINE_PAGE_SIZES,
} from "./timelineApi";

describe("timeline pagination API helpers", () => {
  it("defaults to ten events and exposes all supported page sizes", () => {
    expect(DEFAULT_TIMELINE_PAGE_SIZE).toBe(10);
    expect(TIMELINE_PAGE_SIZES).toEqual([5, 10, 15, 20, 50]);
  });

  it("builds page URLs with an optional category filter", () => {
    expect(buildTimelinePageUrl(2, 15, "All")).toBe(
      "http://localhost:3000/api/events?page=2&pageSize=15",
    );
    expect(buildTimelinePageUrl(1, 10, "Sleep")).toBe(
      "http://localhost:3000/api/events?page=1&pageSize=10&category=Sleep",
    );
  });

  it("does not let a slower earlier page response overwrite the latest request", async () => {
    let resolveFirst!: (response: Response) => void;
    let resolveSecond!: (response: Response) => void;
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveFirst = resolve)),
      )
      .mockImplementationOnce(
        () => new Promise((resolve) => (resolveSecond = resolve)),
      );
    const loadPage = createTimelinePageLoader(fetcher);
    const first = loadPage<{ id: string }>("/api/events?page=1", new AbortController().signal);
    const second = loadPage<{ id: string }>("/api/events?page=2", new AbortController().signal);

    resolveSecond(
      Response.json({ events: [{ id: "newer" }], pagination: { page: 2 } }),
    );
    await expect(second).resolves.toMatchObject({
      status: "success",
      data: { events: [{ id: "newer" }] },
    });

    resolveFirst(
      Response.json({ events: [{ id: "stale" }], pagination: { page: 1 } }),
    );
    await expect(first).resolves.toEqual({ status: "stale" });
  });
});
