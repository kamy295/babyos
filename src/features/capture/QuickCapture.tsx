import CategoryDropdown from "../../components/ui/CategoryDropdown";
import { NOTE_CATEGORIES } from "../../types/notes";
import type { QuickCaptureDraftEvent } from "./quickCaptureApi";
import "./QuickCapture.css";

type QuickCaptureProps = {
  noteInput: string;
  draftEvents: QuickCaptureDraftEvent[];
  isProcessingCapture: boolean;
  captureError: string;
  isSavingCapture: boolean;
  onNoteInputChange: (value: string) => void;
  onAddNote: () => void;
  onConfirmNote: () => void;
  onDiscardDraft: () => void;
  onUpdateDraftEvent: (
    index: number,
    field: "content" | "category" | "mediaUrl",
    value: string,
  ) => void;
};

function QuickCapture({
  noteInput,
  draftEvents,
  isProcessingCapture,
  captureError,
  onNoteInputChange,
  onAddNote,
  onConfirmNote,
  onDiscardDraft,
  onUpdateDraftEvent,
  isSavingCapture,
}: QuickCaptureProps) {
  return (
    <section className="quick-capture">
      <div>
        <h2>What's happening today?</h2>
        <p>Capture a note, moment or reminder.</p>
      </div>

      <textarea
        value={noteInput}
        onChange={(event) => onNoteInputChange(event.target.value)}
        placeholder="E.g. Dhruv slept at 1:30 PM for about an hour..."
        rows={3}
      />

      <button
        type="button"
        onClick={onAddNote}
        disabled={!noteInput.trim() || isProcessingCapture}
      >
        {isProcessingCapture ? "Organising your note..." : "+ Add a note"}
      </button>

      {captureError && (
        <p className="capture-error" role="alert">
          {captureError}
        </p>
      )}

      {draftEvents.length > 0 && (
        <div className="review-card">
          <p className="review-label">
            REVIEW YOUR NOTES ({draftEvents.length})
          </p>

          {draftEvents.map((event, index) => (
            <div className="draft-event" key={index}>
              <textarea
                value={event.content}
                onChange={(e) =>
                  onUpdateDraftEvent(index, "content", e.target.value)
                }
                rows={2}
              />

              <CategoryDropdown
                value={event.category}
                options={NOTE_CATEGORIES}
                onChange={(value) =>
                  onUpdateDraftEvent(index, "category", value)
                }
              />

              <label className="draft-media-url">
                Photos &amp; Videos (optional)
                <input
                  type="url"
                  value={event.mediaUrl ?? ""}
                  onChange={(e) =>
                    onUpdateDraftEvent(index, "mediaUrl", e.target.value)
                  }
                  placeholder="Paste a Google Drive, Photos or other link"
                  aria-label={`Photos & Videos link for event ${index + 1}`}
                />
              </label>
            </div>
          ))}

          <div className="review-actions">
            <button
              type="button"
              className="action-button"
              onClick={onConfirmNote}
              disabled={
                isSavingCapture ||
                draftEvents.some((event) => !event.content.trim())
              }
            >
              {isSavingCapture ? "Saving..." : "Confirm and save all"}
            </button>

            <button
              type="button"
              className="action-button discard-button"
              onClick={onDiscardDraft}
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default QuickCapture;
