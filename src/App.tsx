import "./App.css";
import { useEffect, useState } from "react";
import {
  type FamilyNote,
  type NoteCategory,
  type TimelineFilter,
} from "./types/notes";
import Timeline from "./features/timeline/Timeline";
import QuickCapture from "./features/capture/QuickCapture";
import TaskManager from "./features/tasks/TaskManager";
import { type Task, type TaskFilter } from "./types/tasks";
import AskBabyOS from "./features/ask/AskBabyOS";
import SleepTracker from "./features/sleep/SleepTracker";
import type { SleepSession } from "./types/sleep";

const STORAGE_KEY = "babyos:family-notes";
const SLEEP_STORAGE_KEY = "babyos:sleep-sessions";
const TASK_STORAGE_KEY = "babyos:tasks";
type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "babyos:theme";

function isFamilyNote(value: unknown): value is FamilyNote {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const note = value as Record<string, unknown>;

  return (
    typeof note.id === "number" &&
    typeof note.content === "string" &&
    typeof note.category === "string" &&
    ["General", "Sleep", "Feeding", "Activity", "Health", "Milestone"].includes(
      note.category,
    ) &&
    typeof note.createdAt === "string"
  );
}

function loadSavedNotes(): FamilyNote[] {
  try {
    const storedNotes = localStorage.getItem(STORAGE_KEY);

    if (!storedNotes) return [];

    const parsedNotes: unknown = JSON.parse(storedNotes);

    if (!Array.isArray(parsedNotes)) return [];

    return parsedNotes.filter(isFamilyNote);
  } catch {
    return [];
  }
}

function loadSavedTasks(): Task[] {
  try {
    const storedTasks = localStorage.getItem(TASK_STORAGE_KEY);

    if (!storedTasks) return [];

    const parsedTasks: unknown = JSON.parse(storedTasks);

    if (!Array.isArray(parsedTasks)) return [];

    return parsedTasks.filter(
      (task): task is Task =>
        typeof task === "object" &&
        task !== null &&
        typeof task.id === "number" &&
        typeof task.title === "string" &&
        typeof task.dueDate === "string" &&
        typeof task.completed === "boolean" &&
        typeof task.createdAt === "string",
    );
  } catch {
    return [];
  }
}

function isSleepSession(value: unknown): value is SleepSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const session = value as Record<string, unknown>;

  return (
    typeof session.id === "number" &&
    typeof session.startTime === "string" &&
    (typeof session.endTime === "string" || session.endTime === null)
  );
}

function loadSavedSleepSessions(): SleepSession[] {
  try {
    const storedSessions = localStorage.getItem(SLEEP_STORAGE_KEY);

    if (!storedSessions) return [];

    const parsedSessions: unknown = JSON.parse(storedSessions);

    if (!Array.isArray(parsedSessions)) return [];

    return parsedSessions.filter(isSleepSession);
  } catch {
    return [];
  }
}
function getTodaySleepDuration(sessions: SleepSession[]): number {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // Start and end of today in Indian Standard Time.
  const todayStart = new Date(`${today}T00:00:00+05:30`).getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;

  const totalMilliseconds = sessions.reduce((total, session) => {
    if (!session.endTime) return total;

    const sessionStart = new Date(session.startTime).getTime();
    const sessionEnd = new Date(session.endTime).getTime();

    if (
      Number.isNaN(sessionStart) ||
      Number.isNaN(sessionEnd) ||
      sessionEnd <= sessionStart
    ) {
      return total;
    }

    const overlapStart = Math.max(sessionStart, todayStart);
    const overlapEnd = Math.min(sessionEnd, todayEnd);

    return total + Math.max(0, overlapEnd - overlapStart);
  }, 0);

  return Math.floor(totalMilliseconds / 60000);
}

function formatSleepDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0 && minutes === 0) return "0m";
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;

  return `${hours}h ${minutes}m`;
}

function loadSavedTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

function App() {
  const [theme, setTheme] = useState<Theme>(loadSavedTheme);
  const [noteInput, setNoteInput] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [savedNotes, setSavedNotes] = useState<FamilyNote[]>(loadSavedNotes);
  const [noteCategory, setNoteCategory] = useState<NoteCategory>("General");
  const [activeFilter, setActiveFilter] = useState<TimelineFilter>("All");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState<NoteCategory>("General");
  const [deletingNoteId, setDeletingNoteId] = useState<number | null>(null);

  const [tasks, setTasks] = useState<Task[]>(loadSavedTasks);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [activeTaskFilter, setActiveTaskFilter] = useState<TaskFilter>("All");
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDueDate, setEditTaskDueDate] = useState("");

  const [sleepSessions, setSleepSessions] = useState<SleepSession[]>(
    loadSavedSleepSessions,
  );
  const todaySleepMinutes = getTodaySleepDuration(sleepSessions);

  const activeSleepSession = sleepSessions.find(
    (session) => session.endTime === null,
  );

  const handleAddNote = () => {
    const trimmedNote = noteInput.trim();

    if (!trimmedNote) return;

    setDraftNote(trimmedNote);
    setNoteInput("");
  };

  const handleConfirmNote = () => {
    if (!draftNote) return;

    const newNote: FamilyNote = {
      id: Date.now(),
      content: draftNote,
      category: noteCategory,
      createdAt: new Date().toISOString(),
    };

    setSavedNotes((previousNotes) => [newNote, ...previousNotes]);
    setDraftNote("");
  };

  const handleDeleteNote = (id: number) => {
    setSavedNotes((previousNotes) =>
      previousNotes.filter((note) => note.id !== id),
    );

    if (editingNoteId === id) {
      setEditingNoteId(null);
    }

    setDeletingNoteId(null);
  };

  const handleEditNote = (note: FamilyNote) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
    setEditCategory(note.category);
  };

  const handleSaveEdit = () => {
    if (!editContent.trim() || editingNoteId === null) return;

    setSavedNotes((previousNotes) =>
      previousNotes.map((note) =>
        note.id === editingNoteId
          ? {
              ...note,
              content: editContent.trim(),
              category: editCategory,
            }
          : note,
      ),
    );

    setEditingNoteId(null);
    setEditContent("");
    setEditCategory("General");
  };

  const handleAddTask = () => {
    const trimmedTitle = taskTitle.trim();

    if (!trimmedTitle) return;

    const newTask: Task = {
      id: Date.now(),
      title: trimmedTitle,
      dueDate: taskDueDate,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    setTasks((previousTasks) => [newTask, ...previousTasks]);
    setTaskTitle("");
    setTaskDueDate("");
  };

  const handleToggleTask = (id: number) => {
    setTasks((previousTasks) =>
      previousTasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task,
      ),
    );
  };

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskDueDate(task.dueDate);
  };

  const handleSaveTaskEdit = () => {
    if (!editTaskTitle.trim() || editingTaskId === null) return;

    setTasks((previousTasks) =>
      previousTasks.map((task) =>
        task.id === editingTaskId
          ? {
              ...task,
              title: editTaskTitle.trim(),
              dueDate: editTaskDueDate,
            }
          : task,
      ),
    );

    setEditingTaskId(null);
    setEditTaskTitle("");
    setEditTaskDueDate("");
  };

  const handleDeleteTask = (id: number) => {
    setTasks((previousTasks) => previousTasks.filter((task) => task.id !== id));

    if (editingTaskId === id) {
      setEditingTaskId(null);
    }
  };

  const pendingTasksCount = tasks.filter((task) => !task.completed).length;

  const handleStartSleep = () => {
    setSleepSessions((previousSessions) => {
      const hasActiveSession = previousSessions.some(
        (session) => session.endTime === null,
      );

      if (hasActiveSession) return previousSessions;

      return [
        {
          id: Date.now(),
          startTime: new Date().toISOString(),
          endTime: null,
        },
        ...previousSessions,
      ];
    });
  };

  const handleEndSleep = () => {
    setSleepSessions((previousSessions) => {
      const activeSession = previousSessions.find(
        (session) => session.endTime === null,
      );

      if (!activeSession) return previousSessions;

      return previousSessions.map((session) =>
        session.id === activeSession.id
          ? { ...session, endTime: new Date().toISOString() }
          : session,
      );
    });
  };

  const handleAddSleepSession = (startTime: string, endTime: string) => {
    const newSession: SleepSession = {
      id: Date.now(),
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
    };

    setSleepSessions((previousSessions) => [newSession, ...previousSessions]);
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedNotes));
    } catch (error) {
      console.error("Failed to save notes:", error);
    }
  }, [savedNotes]);

  useEffect(() => {
    try {
      localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error("Failed to save tasks:", error);
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem(SLEEP_STORAGE_KEY, JSON.stringify(sleepSessions));
    } catch (error) {
      console.error("Failed to save sleep sessions:", error);
    }
  }, [sleepSessions]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error("Failed to save theme preference:", error);
    }
  }, [theme]);

  return (
    <main className="app">
      <header className="app-header">
        <div className="brand">
          <img src="/babyos-logo-new.png" alt="BabyOS" className="brand-logo" />
        </div>

        <div className="header-actions">
          <span className="header-label">
            Your little one's world, a little more organised.
          </span>

          <button
            type="button"
            className="theme-toggle"
            onClick={() =>
              setTheme((currentTheme) =>
                currentTheme === "light" ? "dark" : "light",
              )
            }
            aria-label={
              theme === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
            title={
              theme === "light" ? "Switch to dark mode" : "Switch to light mode"
            }
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        </div>
      </header>

      <nav className="app-nav" aria-label="Dashboard navigation">
        <a href="#overview">Overview</a>
        <a href="#quick-capture">Quick Capture</a>
        <a href="#sleep-tracker">Sleep</a>
        <a href="#ask-babyos">Ask BabyOS</a>
        <a href="#tasks">Tasks</a>
        <a href="#timeline">Timeline</a>
      </nav>

      <section className="welcome">
        <p className="eyebrow">YOUR FAMILY, IN ONE PLACE</p>
        <h1>A little more organised, a little less overwhelmed.</h1>
        <p className="welcome-description">
          Keep track of your little one's everyday moments, tasks and
          milestones.
        </p>
      </section>

      <section className="overview nav-section" id="overview">
        <div className="section-heading">
          <h2>Your overview</h2>
          <span>Today</span>
        </div>

        <div className="overview-grid">
          <article className="overview-card">
            <span className="card-icon">🌙</span>
            <p>Sleep</p>

            <h3>
              {todaySleepMinutes > 0
                ? formatSleepDuration(todaySleepMinutes)
                : "Not tracked yet"}
            </h3>

            <span>
              {activeSleepSession ? "Currently sleeping" : "Total sleep today"}
            </span>
          </article>
          <article className="overview-card">
            <span className="card-icon">✓</span>
            <p>Tasks</p>
            <h3>{pendingTasksCount} pending</h3>
          </article>

          <article className="overview-card">
            <span className="card-icon">📅</span>
            <p>Timeline</p>
            <h3>{savedNotes.length} moments</h3>
          </article>
        </div>
      </section>

      <div id="quick-capture" className="nav-section">
        <QuickCapture
          noteInput={noteInput}
          noteCategory={noteCategory}
          draftNote={draftNote}
          onNoteInputChange={setNoteInput}
          onCategoryChange={setNoteCategory}
          onAddNote={handleAddNote}
          onConfirmNote={handleConfirmNote}
          onDiscardDraft={() => setDraftNote("")}
        />
      </div>

      <div id="sleep-tracker" className="nav-section">
        <SleepTracker
          sleepSessions={sleepSessions}
          onStartSleep={handleStartSleep}
          onEndSleep={handleEndSleep}
          onAddSleepSession={handleAddSleepSession}
        />
      </div>

      <div id="ask-babyos" className="nav-section">
        <AskBabyOS notes={savedNotes} tasks={tasks} />
      </div>

      <div id="tasks" className="nav-section">
        <TaskManager
          tasks={tasks}
          taskTitle={taskTitle}
          taskDueDate={taskDueDate}
          activeFilter={activeTaskFilter}
          onTaskTitleChange={setTaskTitle}
          onTaskDueDateChange={setTaskDueDate}
          onAddTask={handleAddTask}
          onFilterChange={setActiveTaskFilter}
          onToggleComplete={handleToggleTask}
          editingTaskId={editingTaskId}
          editTaskTitle={editTaskTitle}
          editTaskDueDate={editTaskDueDate}
          onEditRequest={handleEditTask}
          onEditTitleChange={setEditTaskTitle}
          onEditDueDateChange={setEditTaskDueDate}
          onSaveEdit={handleSaveTaskEdit}
          onCancelEdit={() => setEditingTaskId(null)}
          onDelete={handleDeleteTask}
        />
      </div>

      <div id="timeline" className="nav-section">
        <Timeline
          notes={savedNotes}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          editingNoteId={editingNoteId}
          deletingNoteId={deletingNoteId}
          editContent={editContent}
          editCategory={editCategory}
          onEdit={handleEditNote}
          onEditContentChange={setEditContent}
          onEditCategoryChange={setEditCategory}
          onSaveEdit={handleSaveEdit}
          onCancelEdit={() => setEditingNoteId(null)}
          onDeleteRequest={setDeletingNoteId}
          onConfirmDelete={handleDeleteNote}
          onCancelDelete={() => setDeletingNoteId(null)}
        />
      </div>
    </main>
  );
}

export default App;
