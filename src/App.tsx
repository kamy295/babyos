import "./App.css";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  type FamilyNote,
  type FamilyEvent,
  type NoteCategory,
} from "./types/notes";
import Timeline from "./features/timeline/Timeline";
import {
  buildTimelinePageUrl,
  createTimelinePageLoader,
  DEFAULT_TIMELINE_PAGE_SIZE,
  type TimelinePagination,
} from "./features/timeline/timelineApi";
import {
  getTimelineFallbackPage,
  INITIAL_TIMELINE_VIEW_STATE,
  reduceTimelineView,
} from "./features/timeline/timelineState";
import QuickCapture from "./features/capture/QuickCapture";
import TaskManager from "./features/tasks/TaskManager";
import { type Task, type TaskFilter } from "./types/tasks";
import {
  createTask as createPersistedTask,
  deleteTask as deletePersistedTask,
  getTasks,
  importLegacyTaskBatch,
  updateTask as updatePersistedTask,
} from "./features/tasks/taskApi";
import {
  mergeLegacyTasks,
  getLegacyTaskSourceId,
  migrateLegacyTasks,
  readLegacyTasks,
} from "./features/tasks/taskMigration";
import AskBabyOS from "./features/ask/AskBabyOS";
import SleepTracker from "./features/sleep/SleepTracker";
import {
  processQuickCapture,
  saveQuickCapture,
  updateQuickCaptureDraftEvent,
  type QuickCaptureDraftEvent,
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
import {
  getTodaySleepDuration,
  mapSleepEventsToSessions,
} from "./features/sleep/sleepUtils";

const STORAGE_KEY = "babyos:family-notes";
type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "babyos:theme";

type ApiEvent = {
  id: string;
  source_note_id: string;
  is_tracker_session: boolean;
  content: string;
  category: NoteCategory;
  event_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  quantity: number | null;
  unit: string | null;
  duration_minutes: number | null;
  media_url?: string | null;
  recorded_at: string;
  created_at: string;
};

type EventsApiResponse = {
  events: ApiEvent[];
};

function mapApiEvent(event: ApiEvent): FamilyEvent {
  return {
    id: event.id,
    sourceNoteId: event.source_note_id,
    isTrackerSession: event.is_tracker_session,
    content: event.content,
    category: event.category,
    eventDate: event.event_date,
    endDate: event.end_date,
    startTime: event.start_time,
    endTime: event.end_time,
    quantity: event.quantity,
    unit: event.unit,
    durationMinutes: event.duration_minutes,
    mediaUrl: event.media_url ?? null,
    recordedAt: event.recorded_at,
    createdAt: event.created_at,
  };
}

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
  const [draftOriginalNote, setDraftOriginalNote] = useState("");
  const [isSavingCapture, setIsSavingCapture] = useState(false);
  const [draftEvents, setDraftEvents] = useState<QuickCaptureDraftEvent[]>([]);
  const [isProcessingCapture, setIsProcessingCapture] = useState(false);
  const [captureError, setCaptureError] = useState("");
  const [savedNotes] = useState<FamilyNote[]>(loadSavedNotes);
  const [timelineView, dispatchTimelineView] = useReducer(
    reduceTimelineView,
    INITIAL_TIMELINE_VIEW_STATE,
  );
  const {
    category: activeFilter,
    page: timelinePage,
    pageSize: timelinePageSize,
    refreshVersion: timelineRefreshVersion,
  } = timelineView;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [areTasksReady, setAreTasksReady] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const taskMutationInProgress = useRef(false);
  const [tasksError, setTasksError] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [activeTaskFilter, setActiveTaskFilter] = useState<TaskFilter>("All");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState("");
  const [editTaskDueDate, setEditTaskDueDate] = useState("");

  const [events, setEvents] = useState<FamilyEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState("");
  const [timelineEvents, setTimelineEvents] = useState<FamilyEvent[]>([]);
  const [timelinePagination, setTimelinePagination] =
    useState<TimelinePagination>({
      page: 1,
      pageSize: DEFAULT_TIMELINE_PAGE_SIZE,
      totalRecords: 0,
      totalPages: 0,
    });
  const [timelineRequestState, setTimelineRequestState] = useState<{
    key: string;
    status: "success" | "error";
    message?: string;
  } | null>(null);
  const timelinePageLoader = useRef(createTimelinePageLoader());
  const timelineQueryKey = `${activeFilter}:${timelinePage}:${timelinePageSize}:${timelineRefreshVersion}`;
  const isLoadingTimeline = timelineRequestState?.key !== timelineQueryKey;
  const timelineError =
    timelineRequestState?.key === timelineQueryKey &&
    timelineRequestState.status === "error"
      ? (timelineRequestState.message ?? "Unable to load timeline events.")
      : "";

  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<FamilyEvent | null>(null);
  const [isSavingEvent, setIsSavingEvent] = useState(false);

  const [isSleepActionInProgress, setIsSleepActionInProgress] = useState(false);
  const sleepActionInProgress = useRef(false);
  const [areEventsLoaded, setAreEventsLoaded] = useState(false);

  const sleepSessions = mapSleepEventsToSessions(events);

  const refreshTimeline = useCallback(() => {
    dispatchTimelineView({ type: "refresh" });
  }, []);

  const todaySleepMinutes = getTodaySleepDuration(sleepSessions);
  const { notify } = useNotification();

  const loadTasks = useCallback(async () => {
    setIsLoadingTasks(true);
    setTasksError("");
    let serverTasks: Task[] = [];

    try {
      serverTasks = await getTasks();
      const migration = await migrateLegacyTasks(
        localStorage,
        importLegacyTaskBatch,
        getTasks,
      );

      if (migration.status === "imported") {
        serverTasks = migration.tasks;
      }

      setTasks(serverTasks);
      setAreTasksReady(true);
    } catch (error) {
      try {
        setTasks(
          mergeLegacyTasks(
            serverTasks,
            readLegacyTasks(localStorage),
            getLegacyTaskSourceId(localStorage),
          ),
        );
      } catch {
        // Keep any successfully loaded server tasks and preserve unreadable local data.
        setTasks(serverTasks);
      }
      setAreTasksReady(false);
      setTasksError(
        error instanceof Error
          ? error.message
          : "Unable to load or migrate saved tasks.",
      );
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

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
      setDraftEvents(events.map((event) => ({ ...event, mediaUrl: null })));
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
      refreshTimeline();

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
    field: "content" | "category" | "mediaUrl",
    value: string,
  ) => {
    setDraftEvents((previousEvents) =>
      updateQuickCaptureDraftEvent(previousEvents, index, field, value),
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
      refreshTimeline();

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
      refreshTimeline();
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

  const beginTaskMutation = () => {
    if (!areTasksReady || taskMutationInProgress.current) return false;
    taskMutationInProgress.current = true;
    setIsSavingTask(true);
    setTasksError("");
    return true;
  };

  const endTaskMutation = () => {
    taskMutationInProgress.current = false;
    setIsSavingTask(false);
  };

  const handleAddTask = async () => {
    const trimmedTitle = taskTitle.trim();

    if (!trimmedTitle) return;
    if (!beginTaskMutation()) return;

    try {
      const createdTask = await createPersistedTask({
        title: trimmedTitle,
        dueDate: taskDueDate || null,
      });
      setTasks((previousTasks) => [createdTask, ...previousTasks]);
      setTaskTitle("");
      setTaskDueDate("");
      notify({
        type: "success",
        title: "Task created successfully",
        message: "Your new task has been added.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to save the task.";
      setTasksError(message);
      notify({ type: "error", title: "Unable to save task", message });
    } finally {
      endTaskMutation();
    }
  };

  const handleToggleTask = async (id: string) => {
    const task = tasks.find((item) => item.id === id);

    if (!task || !beginTaskMutation()) return;

    const isCompleting = !task.completed;

    try {
      const updatedTask = await updatePersistedTask(id, {
        completed: isCompleting,
      });
      setTasks((previousTasks) =>
        previousTasks.map((item) => (item.id === id ? updatedTask : item)),
      );
      notify({
        type: "success",
        title: isCompleting ? "Task completed" : "Task reopened",
        message: isCompleting
          ? `"${task.title}" has been marked as complete.`
          : `"${task.title}" has been moved back to pending.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update the task.";
      setTasksError(message);
      notify({ type: "error", title: "Unable to update task", message });
    } finally {
      endTaskMutation();
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTaskTitle(task.title);
    setEditTaskDueDate(task.dueDate);
  };

  const handleSaveTaskEdit = async () => {
    if (!editTaskTitle.trim() || editingTaskId === null) return;
    if (!beginTaskMutation()) return;

    try {
      const updatedTask = await updatePersistedTask(editingTaskId, {
        title: editTaskTitle.trim(),
        dueDate: editTaskDueDate || null,
      });
      setTasks((previousTasks) =>
        previousTasks.map((task) =>
          task.id === editingTaskId ? updatedTask : task,
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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to update the task.";
      setTasksError(message);
      notify({ type: "error", title: "Unable to update task", message });
    } finally {
      endTaskMutation();
    }
  };

  const handleDeleteTask = async (id: string) => {
    const task = tasks.find((item) => item.id === id);

    if (!task || !beginTaskMutation()) return;

    try {
      await deletePersistedTask(id);
      setTasks((previousTasks) => previousTasks.filter((item) => item.id !== id));
      if (editingTaskId === id) setEditingTaskId(null);
      notify({
        type: "success",
        title: "Task deleted successfully",
        message: `"${task.title}" has been removed.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to delete the task.";
      setTasksError(message);
      notify({ type: "error", title: "Unable to delete task", message });
    } finally {
      endTaskMutation();
    }
  };

  const pendingTasksCount = tasks.filter((task) => !task.completed).length;

  const handleStartSleep = async () => {
    if (sleepActionInProgress.current || activeSleepSession) return;

    sleepActionInProgress.current = true;
    setIsSleepActionInProgress(true);

    try {
      await createSleepEvent(new Date().toISOString());
      await fetchEvents();
      refreshTimeline();

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
      refreshTimeline();

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
      refreshTimeline();

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
    const timer = window.setTimeout(() => void loadTasks(), 0);
    return () => window.clearTimeout(timer);
  }, [loadTasks]);

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
        const response = await fetch(
          "http://localhost:3000/api/events?category=Sleep",
          {
            signal,
          },
        );

        if (!response.ok) {
          throw new Error("Unable to load timeline events.");
        }

        const result: EventsApiResponse = await response.json();

        const mappedEvents = result.events.map(mapApiEvent);

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

  useEffect(() => {
    const controller = new AbortController();
    const url = buildTimelinePageUrl(
      timelinePage,
      timelinePageSize,
      activeFilter,
    );

    const loadTimelinePage = timelinePageLoader.current;
    void loadTimelinePage<ApiEvent>(url, controller.signal)
      .then((result) => {
        if (result.status === "stale") return;

        const { pagination } = result.data;
        const validPage = getTimelineFallbackPage(
          timelinePage,
          pagination.totalPages,
          pagination.totalRecords,
          result.data.events.length,
        );
        if (validPage !== null) {
          setTimelinePagination({ ...pagination, page: validPage });
          dispatchTimelineView({
            type: "page-clamped",
            page: validPage,
          });
          return;
        }

        setTimelineEvents(result.data.events.map(mapApiEvent));
        setTimelinePagination(pagination);
        setTimelineRequestState({ key: timelineQueryKey, status: "success" });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setTimelineRequestState({
          key: timelineQueryKey,
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Something went wrong while loading the timeline.",
        });
      });

    return () => controller.abort();
  }, [
    activeFilter,
    timelinePage,
    timelinePageSize,
    timelineRefreshVersion,
    timelineQueryKey,
  ]);

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
        <AskBabyOS tasks={tasks} />
      </div>

      <div id="tasks" className="nav-section">
        <TaskManager
          tasks={tasks}
          isLoading={isLoadingTasks}
          isSaving={isSavingTask}
          canManageTasks={areTasksReady}
          error={tasksError}
          onRetry={loadTasks}
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
              events={timelineEvents}
              activeFilter={activeFilter}
              onFilterChange={(category) => {
                if (category !== activeFilter) {
                  setTimelinePagination((current) => ({ ...current, page: 1 }));
                }
                dispatchTimelineView({ type: "category-changed", category });
              }}
              pagination={timelinePagination}
              pageSize={timelinePageSize}
              isLoading={isLoadingTimeline}
              error={timelineError}
              onPageChange={(page) => {
                dispatchTimelineView({ type: "page-changed", page });
                setTimelinePagination((current) => ({ ...current, page }));
              }}
              onPageSizeChange={(pageSize) => {
                dispatchTimelineView({ type: "page-size-changed", pageSize });
                setTimelinePagination((current) => ({
                  ...current,
                  page: 1,
                  pageSize,
                }));
              }}
              onRetry={refreshTimeline}
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
