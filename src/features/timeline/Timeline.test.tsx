import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import Timeline from "./Timeline";

const baseProps: ComponentProps<typeof Timeline> = {
  events: [],
  activeFilter: "All",
  onFilterChange: vi.fn(),
  pagination: { page: 1, pageSize: 10, totalRecords: 0, totalPages: 0 },
  pageSize: 10,
  isLoading: false,
  error: "",
  onPageChange: vi.fn(),
  onPageSizeChange: vi.fn(),
  onRetry: vi.fn(),
  onDeleteEvent: vi.fn(),
  deletingEventId: null,
  onEditEvent: vi.fn(),
};

describe("Timeline pagination controls and states", () => {
  it("renders the compact page-size options and current page", () => {
    const markup = renderToStaticMarkup(createElement(Timeline, baseProps));

    expect(markup).toContain('aria-label="Events per page"');
    expect(markup).toContain('<option value="5">5</option>');
    expect(markup).toContain('<option value="10" selected="">10</option>');
    expect(markup).toContain('<option value="15">15</option>');
    expect(markup).toContain('<option value="20">20</option>');
    expect(markup).toContain('<option value="50">50</option>');
    expect(markup).toContain("Page 1 of 1");
  });

  it("renders loading, error with retry, and empty states", () => {
    expect(
      renderToStaticMarkup(
        createElement(Timeline, { ...baseProps, isLoading: true }),
      ),
    ).toContain("Loading timeline");

    expect(
      renderToStaticMarkup(
        createElement(Timeline, { ...baseProps, error: "Timeline unavailable" }),
      ),
    ).toContain("Timeline unavailable");

    expect(
      renderToStaticMarkup(createElement(Timeline, baseProps)),
    ).toContain("No moments found");
  });
});
