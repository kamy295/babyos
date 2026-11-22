import EventCard from "./EventCard";
import {
  TIMELINE_FILTERS,
  type FamilyEvent,
  type TimelineFilter,
} from "../../types/notes";
import "./Timeline.css";

type TimelineProps = {
  events: FamilyEvent[];
  activeFilter: TimelineFilter;
  onFilterChange: (filter: TimelineFilter) => void;
  onDeleteEvent: (eventId: string) => void;
  deletingEventId: string | null;
  onEditEvent: (event: FamilyEvent) => void;
};

function Timeline({
  events,
  activeFilter,
  onFilterChange,
  onDeleteEvent,
  deletingEventId,
  onEditEvent,
}: TimelineProps) {
  const filteredEvents =
    activeFilter === "All"
      ? events
      : events.filter((event) => event.category === activeFilter);

  return (
    <section className="tasks-section">
      <div className="section-heading">
        <h2>Family timeline</h2>
        <span>{filteredEvents.length} moments</span>
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

      {filteredEvents.length === 0 ? (
        <div className="empty-state">
          <p>No moments found</p>
          <span>Try another category or capture a new moment.</span>
        </div>
      ) : (
        <div className="notes-list">
          {filteredEvents.map((event) => (
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
    </section>
  );
}

export default Timeline;
