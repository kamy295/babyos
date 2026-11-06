import CategoryDropdown from "../../components/ui/CategoryDropdown";
import { NOTE_CATEGORIES, type NoteCategory } from "../../types/notes";
import "./QuickCapture.css";

type QuickCaptureProps = {
  noteInput: string;
  noteCategory: NoteCategory;
  draftNote: string;
  onNoteInputChange: (value: string) => void;
  onCategoryChange: (value: NoteCategory) => void;
  onAddNote: () => void;
  onConfirmNote: () => void;
  onDiscardDraft: () => void;
};

function QuickCapture({
  noteInput,
  noteCategory,
  draftNote,
  onNoteInputChange,
  onCategoryChange,
  onAddNote,
  onConfirmNote,
  onDiscardDraft,
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

      <CategoryDropdown
        value={noteCategory}
        options={NOTE_CATEGORIES}
        onChange={onCategoryChange}
      />

      <button type="button" onClick={onAddNote} disabled={!noteInput.trim()}>
        + Add a note
      </button>

      {draftNote && (
        <div className="review-card">
          <p className="review-label">REVIEW YOUR NOTE</p>
          <p className="review-content">{draftNote}</p>

          <div className="review-actions">
            <button
              type="button"
              className="action-button"
              onClick={onConfirmNote}
            >
              Confirm and save
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
