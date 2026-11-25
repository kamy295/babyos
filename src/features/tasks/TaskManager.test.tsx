import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import TaskManager from "./TaskManager";

const baseProps: ComponentProps<typeof TaskManager> = {
  tasks: [],
  isLoading: false,
  isSaving: false,
  canManageTasks: true,
  error: "",
  onRetry: vi.fn(),
  taskTitle: "",
  taskDueDate: "",
  activeFilter: "All",
  onTaskTitleChange: vi.fn(),
  onTaskDueDateChange: vi.fn(),
  onAddTask: vi.fn(),
  onFilterChange: vi.fn(),
  onToggleComplete: vi.fn(),
  editingTaskId: null,
  editTaskTitle: "",
  editTaskDueDate: "",
  onEditRequest: vi.fn(),
  onEditTitleChange: vi.fn(),
  onEditDueDateChange: vi.fn(),
  onSaveEdit: vi.fn(),
  onCancelEdit: vi.fn(),
  onDelete: vi.fn(),
};

describe("TaskManager persisted-data states", () => {
  it("shows loading, retryable errors, and empty states", () => {
    expect(
      renderToStaticMarkup(
        createElement(TaskManager, { ...baseProps, isLoading: true }),
      ),
    ).toContain("Loading tasks...");

    const errorMarkup = renderToStaticMarkup(
      createElement(TaskManager, {
        ...baseProps,
        error: "Unable to load tasks.",
      }),
    );
    expect(errorMarkup).toContain("Unable to load tasks.");
    expect(errorMarkup).toContain("Retry");
    expect(errorMarkup).not.toContain("No tasks here yet.");

    expect(
      renderToStaticMarkup(createElement(TaskManager, baseProps)),
    ).toContain("No tasks here yet.");
  });

  it("preserves All, Pending, Completed and due-date display behavior", () => {
    const tasks = [
      {
        id: "task-pending",
        title: "Buy wipes",
        dueDate: "2099-12-31",
        completed: false,
        createdAt: "2026-11-25T08:00:00.000Z",
      },
      {
        id: "task-completed",
        title: "Call the clinic",
        dueDate: "",
        completed: true,
        createdAt: "2026-11-24T08:00:00.000Z",
      },
    ];

    const pending = renderToStaticMarkup(
      createElement(TaskManager, {
        ...baseProps,
        tasks,
        activeFilter: "Pending",
      }),
    );
    expect(pending).toContain("Buy wipes");
    expect(pending).not.toContain("Call the clinic");
    expect(pending).toContain("Due: 2099-12-31");

    const completed = renderToStaticMarkup(
      createElement(TaskManager, {
        ...baseProps,
        tasks,
        activeFilter: "Completed",
      }),
    );
    expect(completed).toContain("Call the clinic");
    expect(completed).not.toContain("Buy wipes");
  });

  it("renders overdue styling and day count next to a pending due date", () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() - 3);
    const dateOnly = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, "0")}-${String(dueDate.getDate()).padStart(2, "0")}`;
    const markup = renderToStaticMarkup(
      createElement(TaskManager, {
        ...baseProps,
        tasks: [
          {
            id: "overdue-task",
            title: "Overdue task",
            dueDate: dateOnly,
            completed: false,
            createdAt: "2026-11-25T08:00:00.000Z",
          },
        ],
      }),
    );

    expect(markup).toContain("task-overdue");
    expect(markup).toContain("3 days overdue");
  });
});
