import { useState } from "react";
import type { FamilyEvent } from "../../types/notes";
import { formatDateTime } from "../../utils/date";

type EventCardProps = {
  event: FamilyEvent;
  onDelete: (eventId: string) => void;
  onEdit: (event: FamilyEvent) => void;
  isDeleting: boolean;
};

function EventCard({ event, onDelete, onEdit, isDeleting }: EventCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const eventTime = event.startTime ? event.startTime.slice(0, 5) : null;
  const endTime = event.endTime ? event.endTime.slice(0, 5) : null;

  const handleDelete = () => {
    onDelete(event.id);
    setIsConfirmingDelete(false);
  };

  return (
    <article className="note-card">
      <div>
        <p>{event.content}</p>

        <span>
          {event.category} · {formatDateTime(event.createdAt)}
        </span>

        {eventTime && (
          <span>
            {" "}
            · {eventTime}
            {endTime ? ` – ${endTime}` : ""}
          </span>
        )}

        {event.durationMinutes !== null && (
          <span> · {event.durationMinutes} minutes</span>
        )}
      </div>

      <div className="event-card-actions">
        {isConfirmingDelete ? (
          <>
            <span>Delete this event?</span>

            <button
              className="action-button delete-button"
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Confirm"}
            </button>
            <button
              type="button"
              className="action-button"
              onClick={() => setIsConfirmingDelete(false)}
              disabled={isDeleting}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            {!event.isTrackerSession && (
              <button
                type="button"
                className="action-button"
                onClick={() => onEdit(event)}
              >
                Edit
              </button>
            )}

            <button
              className="delete-button"
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              disabled={isDeleting}
            >
              Delete
            </button>
          </>
        )}
      </div>
    </article>
  );
}

export default EventCard;
