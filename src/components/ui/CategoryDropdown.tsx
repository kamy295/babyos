import { useState } from "react";
import type { NoteCategory } from "../../types/notes";
import "./CategoryDropdown.css";

type CategoryDropdownProps = {
  value: NoteCategory;
  options: NoteCategory[];
  onChange: (value: NoteCategory) => void;
};

function CategoryDropdown({ value, options, onChange }: CategoryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="category-dropdown"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="category-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setIsOpen(false);
        }}
      >
        <span>{value}</span>
        <span className={`dropdown-chevron ${isOpen ? "is-open" : ""}`}>▾</span>
      </button>

      {isOpen && (
        <div className="category-dropdown-menu" role="listbox">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={value === option}
              className={`category-dropdown-option ${
                value === option ? "selected" : ""
              }`}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
            >
              {option}
              {value === option && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CategoryDropdown;
