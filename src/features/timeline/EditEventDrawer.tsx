import { useState } from "react";
import type { FormEvent } from "react";
import type { FamilyEvent, NoteCategory } from "../../types/notes";
import Drawer from "../../components/ui/Drawer";
import { normalizeOptionalHttpUrl } from "../../utils/mediaUrl";
import "./EditEventDrawer.css";

export type EventUpdates = {
  content: string;
  category: NoteCategory;
  eventDate: string | null;
  startTime: string | null;
  endTime: string | null;
  quantity: number | null;
  unit: string | null;
  durationMinutes: number | null;
  mediaUrl: string | null;
};

type EditEventDrawerProps = {
  event: FamilyEvent | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (eventId: string, updates: EventUpdates) => void;
};

const categories: NoteCategory[] = [
  "Sleep",
  "Feeding",
  "Activity",
  "Health",
  "Milestone",
  "General",
];

function calculateDuration(start: string, end: string): number | null {
  if (!start || !end) return null;

  const [startHours, startMinutes] = start.split(":").map(Number);
  const [endHours, endMinutes] = end.split(":").map(Number);

  let difference =
    endHours * 60 + endMinutes - (startHours * 60 + startMinutes);

  // Support events that continue past midnight.
  if (difference < 0) difference += 24 * 60;

  return difference;
}

type EditEventFormProps = {
  event: FamilyEvent;
  isSaving: boolean;
  onSave: (eventId: string, updates: EventUpdates) => void;
};

function EditEventForm({ event, isSaving, onSave }: EditEventFormProps) {
  const [content, setContent] = useState(event.content);
  const [category, setCategory] = useState<NoteCategory>(event.category);
  const [eventDate, setEventDate] = useState(event.eventDate ?? "");
  const [startTime, setStartTime] = useState(
    event.startTime?.slice(0, 5) ?? "",
  );
  const [endTime, setEndTime] = useState(event.endTime?.slice(0, 5) ?? "");
  const [quantity, setQuantity] = useState(event.quantity?.toString() ?? "");
  const [unit, setUnit] = useState(event.unit ?? "");
  const [durationMinutes, setDurationMinutes] = useState(
    event.durationMinutes?.toString() ?? "",
  );
  const [mediaUrl, setMediaUrl] = useState(event.mediaUrl ?? "");
  const [formError, setFormError] = useState("");

  const handleStartTimeChange = (value: string) => {
    setStartTime(value);
    const duration = calculateDuration(value, endTime);
    setDurationMinutes(duration === null ? "" : duration.toString());
  };

  const handleEndTimeChange = (value: string) => {
    setEndTime(value);
    const duration = calculateDuration(startTime, value);
    setDurationMinutes(duration === null ? "" : duration.toString());
  };

  const handleSubmit = (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();

    if (isSaving) return;

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      setFormError("Event description is required.");
      return;
    }

    let normalizedMediaUrl: string | null;
    try {
      normalizedMediaUrl = normalizeOptionalHttpUrl(mediaUrl);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Enter a valid HTTP or HTTPS URL.",
      );
      return;
    }

    const parsedQuantity =
      category === "Feeding" && quantity.trim() !== ""
        ? Number(quantity)
        : null;

    const parsedDuration =
      (category === "Sleep" || category === "Activity") &&
      durationMinutes.trim() !== ""
        ? Number(durationMinutes)
        : null;

    if (
      (parsedQuantity !== null &&
        (!Number.isFinite(parsedQuantity) || parsedQuantity < 0)) ||
      (parsedDuration !== null &&
        (!Number.isInteger(parsedDuration) || parsedDuration < 0))
    ) {
      setFormError("Enter valid non-negative quantity and duration values.");
      return;
    }

    setFormError("");

    const usesStartTime =
      category === "Sleep" ||
      category === "Activity" ||
      category === "Feeding" ||
      category === "Health";

    const usesEndTime = category === "Sleep" || category === "Activity";

    onSave(event.id, {
      content: trimmedContent,
      category,
      eventDate: eventDate || null,
      startTime: usesStartTime && startTime ? `${startTime}:00` : null,
      endTime: usesEndTime && endTime ? `${endTime}:00` : null,
      quantity: parsedQuantity,
      unit: category === "Feeding" && unit.trim() ? unit.trim() : null,
      durationMinutes: parsedDuration,
      mediaUrl: normalizedMediaUrl,
    });
  };

  return (
    <form
      id="edit-event-form"
      className="edit-event-form"
      onSubmit={handleSubmit}
    >
      {formError && (
        <p className="error-message" role="alert">
          {formError}
        </p>
      )}

      <label>
        Event description
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={3}
          maxLength={1000}
          required
        />
      </label>

      <label>
        Category
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value as NoteCategory)}
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>

      <label>
        Event date
        <input
          type="date"
          value={eventDate}
          onChange={(event) => setEventDate(event.target.value)}
        />
      </label>

      <label>
        Photos &amp; Videos (optional)
        <input
          type="url"
          value={mediaUrl}
          onChange={(event) => setMediaUrl(event.target.value)}
          placeholder="Paste a Google Drive, Photos or other link"
          aria-label="Photos & Videos link"
        />
      </label>

      {(category === "Sleep" || category === "Activity") && (
        <div className="edit-event-time-fields">
          <label>
            Start time
            <input
              type="time"
              value={startTime}
              onChange={(event) => handleStartTimeChange(event.target.value)}
            />
          </label>

          <label>
            End time
            <input
              type="time"
              value={endTime}
              onChange={(event) => handleEndTimeChange(event.target.value)}
            />
          </label>
        </div>
      )}

      {(category === "Feeding" || category === "Health") && (
        <label>
          {category === "Feeding" ? "Feeding time" : "Event time"}
          <input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />
        </label>
      )}

      {category === "Feeding" && (
        <>
          <label>
            Quantity
            <input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="e.g. 150"
            />
          </label>

          <label>
            Unit
            <input
              type="text"
              value={unit}
              onChange={(event) => setUnit(event.target.value)}
              placeholder="e.g. ml, grams"
            />
          </label>
        </>
      )}

      {(category === "Sleep" || category === "Activity") && (
        <label>
          Duration (minutes)
          <input
            type="number"
            min="0"
            step="1"
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(event.target.value)}
            placeholder="Calculated from start and end time"
          />
        </label>
      )}
    </form>
  );
}

function EditEventDrawer({
  event,
  isSaving,
  onClose,
  onSave,
}: EditEventDrawerProps) {
  return (
    <Drawer
      isOpen={event !== null}
      title="Edit event"
      onClose={onClose}
      footer={
        event ? (
          <>
            <button
              type="button"
              className="action-button"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>

            <button
              type="submit"
              form="edit-event-form"
              className="action-button primary-button"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save changes"}
            </button>
          </>
        ) : null
      }
    >
      {event && (
        <EditEventForm
          key={event.id}
          event={event}
          isSaving={isSaving}
          onSave={onSave}
        />
      )}
    </Drawer>
  );
}

export default EditEventDrawer;
