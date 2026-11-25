import { describe, expect, it } from "vitest";
import { getTaskDueDateDisplay } from "./taskDateUtils";

const today = new Date(2026, 10, 25, 12);

describe("task due date display", () => {
  it("labels an overdue pending task with its date and calendar-day count", () => {
    expect(getTaskDueDateDisplay("2026-11-22", false, today)).toEqual({
      text: "Nov 22 · 3 days overdue",
      overdue: true,
    });
  });

  it("labels a task due today without marking it overdue", () => {
    expect(getTaskDueDateDisplay("2026-11-25", false, today)).toEqual({
      text: "Due today",
      overdue: false,
    });
  });

  it("keeps a future due date in the normal format", () => {
    expect(getTaskDueDateDisplay("2026-11-26", false, today)).toEqual({
      text: "Due: 2026-11-26",
      overdue: false,
    });
  });

  it("never marks a completed task overdue", () => {
    expect(getTaskDueDateDisplay("2026-11-22", true, today)).toEqual({
      text: "Due: 2026-11-22",
      overdue: false,
    });
  });

  it("shows no indicator when there is no due date", () => {
    expect(getTaskDueDateDisplay("", false, today)).toBeNull();
  });
});
