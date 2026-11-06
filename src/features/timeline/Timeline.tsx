import NoteCard from "./NoteCard";
import {
  TIMELINE_FILTERS,
  type FamilyNote,
  type NoteCategory,
  type TimelineFilter,
} from "../../types/notes";
import "./Timeline.css";

type TimelineProps = {
  notes: FamilyNote[];
  activeFilter: TimelineFilter;
  onFilterChange: (filter: TimelineFilter) => void;

  editingNoteId: number | null;
  deletingNoteId: number | null;

  editContent: string;
  editCategory: NoteCategory;

  onEdit: (note: FamilyNote) => void;
  onEditContentChange: (value: string) => void;
  onEditCategoryChange: (value: NoteCategory) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;

  onDeleteRequest: (id: number) => void;
  onConfirmDelete: (id: number) => void;
  onCancelDelete: () => void;
};

function Timeline({
  notes,
  activeFilter,
  onFilterChange,
  editingNoteId,
  deletingNoteId,
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
}: TimelineProps) {
  const filteredNotes =
    activeFilter === "All"
      ? notes
      : notes.filter((note) => note.category === activeFilter);

  return (
    <section className="tasks-section">
      <div className="section-heading">
        <h2>Family timeline</h2>
        <span>{filteredNotes.length} moments</span>
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

      {filteredNotes.length === 0 ? (
        <div className="empty-state">
          <p>No moments found</p>
          <span>Try another category or capture a new moment.</span>
        </div>
      ) : (
        <div className="notes-list">
          {filteredNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              isEditing={editingNoteId === note.id}
              isDeleting={deletingNoteId === note.id}
              editContent={editContent}
              editCategory={editCategory}
              onEdit={onEdit}
              onEditContentChange={onEditContentChange}
              onEditCategoryChange={onEditCategoryChange}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
              onDeleteRequest={() => onDeleteRequest(note.id)}
              onConfirmDelete={() => onConfirmDelete(note.id)}
              onCancelDelete={onCancelDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default Timeline;
