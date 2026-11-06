import type { FamilyNote, NoteCategory } from "../../types/notes";
import CategoryDropdown from "../../components/ui/CategoryDropdown";

type NoteCardProps = {
  note: FamilyNote;
  isEditing: boolean;
  isDeleting: boolean;
  editContent: string;
  editCategory: NoteCategory;
  onEdit: (note: FamilyNote) => void;
  onEditContentChange: (value: string) => void;
  onEditCategoryChange: (value: NoteCategory) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDeleteRequest: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
};

function NoteCard({
  note,
  isEditing,
  isDeleting,
  editContent,
  editCategory,
  onEdit,
  onEditContentChange,
  onEditCategoryChange,
  onSaveEdit,
  onCancelEdit,
  onDeleteRequest,
  onConfirmDelete,
  onCancelDelete,
}: NoteCardProps) {
  return (
    <article className="note-card">
      {isEditing ? (
        <div className="edit-note-form">
          <textarea
            value={editContent}
            onChange={(event) => onEditContentChange(event.target.value)}
            rows={3}
          />

          <CategoryDropdown
            value={editCategory}
            options={[
              "General",
              "Sleep",
              "Feeding",
              "Activity",
              "Health",
              "Milestone",
            ]}
            onChange={onEditCategoryChange}
          />

          <div className="review-actions">
            <button
              type="button"
              className="action-button"
              onClick={onSaveEdit}
            >
              Save changes
            </button>

            <button
              type="button"
              className="action-button discard-button"
              onClick={onCancelEdit}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div>
            <p>{note.content}</p>
            <span>
              {note.category} · {note.createdAt}
            </span>
          </div>

          <div className="note-actions">
            <button
              className="action-button"
              type="button"
              onClick={() => onEdit(note)}
            >
              Edit
            </button>

            {isDeleting ? (
              <div className="delete-confirmation">
                <span>Delete this note?</span>

                <button
                  type="button"
                  className="action-button confirm-delete-button"
                  onClick={onConfirmDelete}
                >
                  Yes, delete
                </button>

                <button
                  type="button"
                  className="action-button cancel-delete-button"
                  onClick={onCancelDelete}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="action-button"
                onClick={onDeleteRequest}
              >
                Delete
              </button>
            )}
          </div>
        </>
      )}
    </article>
  );
}

export default NoteCard;
