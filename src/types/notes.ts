export type NoteCategory =
  | "Sleep"
  | "Feeding"
  | "Activity"
  | "Health"
  | "Milestone"
  | "General";

export type FamilyNote = {
  id: number;
  content: string;
  category: NoteCategory;
  createdAt: string;
};

export type FamilyEvent = {
  id: string;
  sourceNoteId: string;
  content: string;
  category: NoteCategory;

  eventDate: string | null;
  startTime: string | null;
  endTime: string | null;

  quantity: number | null;
  unit: string | null;

  durationMinutes: number | null;

  recordedAt: string;
  createdAt: string;
};

export const NOTE_CATEGORIES: NoteCategory[] = [
  "General",
  "Sleep",
  "Feeding",
  "Activity",
  "Health",
  "Milestone",
];

export const TIMELINE_FILTERS = ["All", ...NOTE_CATEGORIES] as const;

export type TimelineFilter = (typeof TIMELINE_FILTERS)[number];
