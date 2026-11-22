import "./App.css";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type FamilyNote,
  type FamilyEvent,
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
import {
  processQuickCapture,
  saveQuickCapture,
  type AiSuggestedEvent,
} from "./features/capture/quickCaptureApi";
import ToastContainer from "./components/notifications/ToastContainer";
import { useNotification } from "./components/notifications/useNotification";
import EditEventDrawer, {
  type EventUpdates,
} from "./features/timeline/EditEventDrawer";
import {
  createSleepEvent,
  completeSleepEvent,
} from "./features/sleep/sleepApi";

const STORAGE_KEY = "babyos:family-notes";
const TASK_STORAGE_KEY = "babyos:tasks";
type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "babyos:theme";

type ApiEvent = {
  id: string;
  source_note_id: string;
  content: string;
  category: NoteCategory;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  quantity: number | null;
  unit: string | null;
  duration_minutes: number | null;
  recorded_at: string;
  created_at: string;
};

type EventsApiResponse = {
  events: ApiEvent[];
};

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

function mapSleepEventsToSessions(events: FamilyEvent[]): SleepSession[] {
  return events
    .filter(
      (event) =>
        event.category === "Sleep" &&
        event.eventDate !== null &&
        event.startTime !== null,
    )
    .map((event) => {
      const startTime = new Date(`${event.eventDate}T${event.startTime}+05:30`);

      let endTime: string | null = null;

      if (event.endTime) {
        const endDate = new Date(`${event.eventDate}T${event.endTime}+05:30`);

        // An end time earlier than the start time means the session
        // continued into the following day.
        if (endDate < startTime) {
          endDate.setTime(endDate.getTime() + 24 * 60 * 60 * 1000);
        }

        endTime = endDate.toISOString();
      }

      return {
        id: event.id,
        startTime: startTime.toISOString(),
        endTime,
      };
    })
    .filter((session) => !Number.isNaN(new Date(session.startTime).getTime()));
}

function App() {
  const [theme, setTheme] = useState<Theme>(loadSavedTheme);
  const [noteInput, setNoteInput] = useState("");
  const [draftOriginalNote, setDraftOriginalNote] = useState("");
  const [isSavingCapture, setIsSavingCapture] = useState(false);
  const [draftEvents, setDraftEvents] = useState<AiSuggestedEvent[]>([]);
  const [isProcessingCapture, setIsProcessingCapture] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const [savedNotes] = useState<FamilyNote[]>(loadSavedNotes);
  const [activeFilter, setActiveFilter] = useState<TimelineFilter>("All");

  const [tasks, setTasks] = useState<Task[]>(loadSavedTasks);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [activeTaskFilter, setActiveTaskFilter] = useState<TaskFilter>("All");
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDueDate, setEditTaskDueDate] = useState("");

  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState("");

  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<FamilyEvent | null>(null);
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  const [isSleepActionInProgress, setIsSleepActionInProgress] = useState(false);
  const sleepActionInProgress = useRef(false);
  const [areEventsLoaded, setAreEventsLoaded] = useState(false);

  const sleepSessions = mapSleepEventsToSessions(events);

  const todaySleepMinutes = getTodaySleepDuration(sleepSessions);
  const { notify } = useNotification();

  const activeSleepSession = sleepSessions.find(
    (session) => session.endTime === null,
  );

  const handleAddNote = async () => {
    const trimmedNote = noteInput.trim();

    if (!trimmedNote || isProcessingCapture) return;

    setIsProcessingCapture(true);
    setCaptureError("");
    setDraftEvents([]);

    try {
      const events = await processQuickCapture(trimmedNote);

      setDraftOriginalNote(trimmedNote);
      setDraftEvents(events);
      setNoteInput("");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.";

      setCaptureError(message);

      notify({
        type: "error",
        title: "AI processing failed",
        message,
      });
    } finally {
      setIsProcessingCapture(false);
    }
  };

  const handleConfirmNote = async () => {
    if (!draftOriginalNote || draftEvents.length === 0 || isSavingCapture) {
      return;
    }

    setIsSavingCapture(true);
    setCaptureError("");

    try {
      await saveQuickCapture(draftOriginalNote, draftEvents);

      await fetchEvents();

      setDraftEvents([]);
      setDraftOriginalNote("");

      notify({
        type: "success",
        title: "Capture saved successfully",
        message: "Your baby's moments have been added to the timeline.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to save your capture. Please try again.";

      setCaptureError(message);

      notify({
        type: "error",
        title: "Unable to save capture",
        message,
      });
    } finally {
      setIsSavingCapture(false);
    }
  };

  const handleDiscardDraft = () => {
    setDraftEvents([]);
    setDraftOriginalNote("");
    setCaptureError("");
  };

  const handleUpdateDraftEvent = (
    index: number,
    field: "content" | "category",
    value: string,
  ) => {
    setDraftEvents((previousEvents) =>
      previousEvents.map((event, currentIndex) => {
        if (currentIndex !== index) return event;

        if (field === "content") {
          return { ...event, content: value };
        }

        return { ...event, category: value as NoteCategory };
      }),
    );
  };

  const handleDeleteEvent = async (eventId: string) => {
    setDeletingEventId(eventId);

    try {
      const response = await fetch(
        `http://localhost:3000/api/events/${eventId}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to delete event.");
      }

      await fetchEvents();

      notify({
        type: "success",
        title: "Event deleted successfully",
        message: "Your timeline has been updated.",
      });
    } catch (error) {
      notify({
        type: "error",
        title: "Unable to delete event",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleSaveEvent = async (eventId: string, updates: EventUpdates) => {
    if (isSavingEvent) return;

    setIsSavingEvent(true);

    try {
      const response = await fetch(
        `http://localhost:3000/api/events/${eventId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to update event.");
      }

      await fetchEvents();
      setEditingEvent(null);

      notify({
        type: "success",
        title: "Event updated successfully",
        message: "Your timeline has been updated.",
      });
    } catch (error) {
      notify({
        type: "error",
        title: "Unable to update event",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setIsSavingEvent(false);
    }
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

    notify({
      type: "success",
      title: "Task created successfully",
      message: "Your new task has been added.",
    });
  };

  const handleToggleTask = (id: number) => {
    const task = tasks.find((item) => item.id === id);

    if (!task) return;

    const isCompleting = !task.completed;

    setTasks((previousTasks) =>
      previousTasks.map((item) =>
        item.id === id ? { ...item, completed: isCompleting } : item,
      ),
    );

    notify({
      type: "success",
      title: isCompleting ? "Task completed" : "Task reopened",
      message: isCompleting
        ? `"${task.title}" has been marked as complete.`
        : `"${task.title}" has been moved back to pending.`,
    });
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

    notify({
      type: "success",
      title: "Task updated successfully",
      message: "Your task details have been saved.",
    });
  };

  const handleDeleteTask = (id: number) => {
    const task = tasks.find((item) => item.id === id);

    if (!task) return;

    setTasks((previousTasks) => previousTasks.filter((item) => item.id !== id));

    if (editingTaskId === id) {
      setEditingTaskId(null);
    }

    notify({
      type: "success",
      title: "Task deleted successfully",
      message: `"${task.title}" has been removed.`,
    });
  };

  const pendingTasksCount = tasks.filter((task) => !task.completed).length;

  const handleStartSleep = async () => {
    if (sleepActionInProgress.current || activeSleepSession) return;

    sleepActionInProgress.current = true;
    setIsSleepActionInProgress(true);

    try {
      await createSleepEvent(new Date().toISOString());
      await fetchEvents();

      notify({
        type: "success",
        title: "Sleep tracking started",
        message: "Your baby's sleep session has started.",
      });
    } catch (error) {
      notify({
        type: "error",
        title: "Unable to start sleep tracking",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      sleepActionInProgress.current = false;
      setIsSleepActionInProgress(false);
    }
  };

  const handleEndSleep = async () => {
    if (sleepActionInProgress.current || !activeSleepSession) return;

    sleepActionInProgress.current = true;
    setIsSleepActionInProgress(true);

    try {
      await completeSleepEvent(activeSleepSession, new Date().toISOString());

      await fetchEvents();

      notify({
        type: "success",
        title: "Sleep session completed",
        message: "Your baby's sleep session has been saved.",
      });
    } catch (error) {
      notify({
        type: "error",
        title: "Unable to end sleep session",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      sleepActionInProgress.current = false;
      setIsSleepActionInProgress(false);
    }
  };

  const handleAddSleepSession = async (
    startTime: string,
    endTime: string,
  ): Promise<boolean> => {
    if (sleepActionInProgress.current) return false;

    sleepActionInProgress.current = true;
    setIsSleepActionInProgress(true);

    try {
      await createSleepEvent(startTime, endTime);
      await fetchEvents();

      notify({
        type: "success",
        title: "Past sleep saved",
        message: "Your sleep history has been updated.",
      });

      return true;
    } catch (error) {
      notify({
        type: "error",
        title: "Unable to save past sleep",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });

      return false;
    } finally {
      sleepActionInProgress.current = false;
      setIsSleepActionInProgress(false);
    }
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
    document.documentElement.dataset.theme = theme;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error("Failed to save theme preference:", error);
    }
  }, [theme]);

  const fetchEvents = useCallback(
    async (options?: { signal?: AbortSignal; showLoading?: boolean }) => {
      const { signal, showLoading = false } = options ?? {};

      if (showLoading) {
        setIsLoadingEvents(true);
      }

      setEventsError("");

      try {
        const response = await fetch("http://localhost:3000/api/events", {
          signal,
        });

        if (!response.ok) {
          throw new Error("Unable to load timeline events.");
        }

        const result: EventsApiResponse = await response.json();

        const mappedEvents: FamilyEvent[] = result.events.map((event) => ({
          id: event.id,
          sourceNoteId: event.source_note_id,
          content: event.content,
          category: event.category,
          eventDate: event.event_date,
          startTime: event.start_time,
          endTime: event.end_time,
          quantity: event.quantity,
          unit: event.unit,
          durationMinutes: event.duration_minutes,
          recordedAt: event.recorded_at,
          createdAt: event.created_at,
        }));

        setEvents(mappedEvents);
        setAreEventsLoaded(true);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        setEventsError(
          error instanceof Error
            ? error.message
            : "Something went wrong while loading events.",
        );
      } finally {
        if (!signal?.aborted && showLoading) {
          setIsLoadingEvents(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();

    void fetchEvents({
      signal: controller.signal,
      showLoading: true,
    });

    return () => controller.abort();
  }, [fetchEvents]);

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
          draftEvents={draftEvents}
          isProcessingCapture={isProcessingCapture}
          captureError={captureError}
          onNoteInputChange={setNoteInput}
          onAddNote={handleAddNote}
          onConfirmNote={handleConfirmNote}
          onDiscardDraft={handleDiscardDraft}
          onUpdateDraftEvent={handleUpdateDraftEvent}
          isSavingCapture={isSavingCapture}
        />
      </div>

      <div id="sleep-tracker" className="nav-section">
        <SleepTracker
          sleepSessions={sleepSessions}
          onStartSleep={handleStartSleep}
          onEndSleep={handleEndSleep}
          onAddSleepSession={handleAddSleepSession}
          areEventsLoaded={areEventsLoaded}
          isSleepActionInProgress={isSleepActionInProgress}
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
        {isLoadingEvents ? (
          <p>Loading timeline...</p>
        ) : eventsError ? (
          <p role="alert">{eventsError}</p>
        ) : (
          <>
            <Timeline
              events={events}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              onDeleteEvent={handleDeleteEvent}
              deletingEventId={deletingEventId}
              onEditEvent={setEditingEvent}
            />
          </>
        )}
      </div>

      <EditEventDrawer
        event={editingEvent}
        isSaving={isSavingEvent}
        onClose={() => setEditingEvent(null)}
        onSave={handleSaveEvent}
      />

      <ToastContainer />
    </main>
  );
}

export default App;
