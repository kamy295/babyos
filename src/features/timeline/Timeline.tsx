import EventCard from "./EventCard";
import {
  TIMELINE_FILTERS,
  type FamilyEvent,
  type TimelineFilter,
} from "../../types/notes";
import {
  TIMELINE_PAGE_SIZES,
  type TimelinePageSize,
  type TimelinePagination,
} from "./timelineApi";
import "./Timeline.css";

type TimelineProps = {
  events: FamilyEvent[];
  activeFilter: TimelineFilter;
  onFilterChange: (filter: TimelineFilter) => void;
  pagination: TimelinePagination;
  pageSize: TimelinePageSize;
  isLoading: boolean;
  error: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: TimelinePageSize) => void;
  onRetry: () => void;
  onDeleteEvent: (eventId: string) => void;
  deletingEventId: string | null;
  onEditEvent: (event: FamilyEvent) => void;
};

function Timeline({
  events,
  activeFilter,
  onFilterChange,
  pagination,
  pageSize,
  isLoading,
  error,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onDeleteEvent,
  deletingEventId,
  onEditEvent,
}: TimelineProps) {
  return (
    <section className="tasks-section">
      <div className="section-heading">
        <h2>Family timeline</h2>
        <span>{pagination.totalRecords} moments</span>
      </div>

      <div className="timeline-filters">
        {TIMELINE_FILTERS.map((category) => (
          <button
            key={category}
            type="button"
            className={activeFilter === category ? "active" : ""}
            onClick={() => onFilterChange(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="timeline-status" role="status" aria-live="polite">
          Loading timeline…
        </p>
      ) : error ? (
        <div className="timeline-status" role="alert">
          <p>{error}</p>
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <p>No moments found</p>
          <span>Try another category or capture a new moment.</span>
        </div>
      ) : (
        <div className="notes-list">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onDelete={onDeleteEvent}
              isDeleting={deletingEventId === event.id}
              onEdit={onEditEvent}
            />
          ))}
        </div>
      )}

      <div className="timeline-pagination" aria-label="Timeline pagination">
        <label className="timeline-page-size">
          <span>Events per page</span>
          <select
            aria-label="Events per page"
            value={pageSize}
            onChange={(event) =>
              onPageSizeChange(Number(event.target.value) as TimelinePageSize)
            }
          >
            {TIMELINE_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="timeline-page-navigation">
          <button
            type="button"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
            aria-label="Previous timeline page"
          >
            Previous
          </button>
          <span aria-live="polite">
            Page {pagination.page} of {Math.max(1, pagination.totalPages)}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={
              pagination.totalPages === 0 ||
              pagination.page >= pagination.totalPages
            }
            aria-label="Next timeline page"
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

export default Timeline;
