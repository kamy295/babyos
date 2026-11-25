import { TASK_FILTERS, type Task, type TaskFilter } from "../../types/tasks";
import { getTaskDueDateDisplay } from "./taskDateUtils";
import "./TaskManager.css";

type TaskManagerProps = {
  tasks: Task[];
  isLoading: boolean;
  isSaving: boolean;
  canManageTasks: boolean;
  error: string;
  onRetry: () => void;
  taskTitle: string;
  taskDueDate: string;
  activeFilter: TaskFilter;
  onTaskTitleChange: (value: string) => void;
  onTaskDueDateChange: (value: string) => void;
  onAddTask: () => void;
  onFilterChange: (filter: TaskFilter) => void;
  onToggleComplete: (id: string) => void;
  editingTaskId: string | null;
  editTaskTitle: string;
  editTaskDueDate: string;
  onEditRequest: (task: Task) => void;
  onEditTitleChange: (value: string) => void;
  onEditDueDateChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
};

function TaskManager({
  tasks,
  isLoading,
  isSaving,
  canManageTasks,
  error,
  onRetry,
  taskTitle,
  taskDueDate,
  activeFilter,
  onTaskTitleChange,
  onTaskDueDateChange,
  onAddTask,
  onFilterChange,
  onToggleComplete,
  editingTaskId,
  editTaskTitle,
  editTaskDueDate,
  onEditRequest,
  onEditTitleChange,
  onEditDueDateChange,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: TaskManagerProps) {
  const filteredTasks = tasks.filter((task) => {
    if (activeFilter === "Pending") return !task.completed;
    if (activeFilter === "Completed") return task.completed;

    return true;
  });

  return (
    <section className="tasks-section">
      <div className="section-heading">
        <div>
          <h2>Tasks & Reminders</h2>
          <p>Keep track of things you need to do.</p>
        </div>
        <span>{tasks.filter((task) => !task.completed).length} pending</span>
      </div>

      {error && (
        <div className="task-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      <div className="task-form">
        <input
          type="text"
          value={taskTitle}
          onChange={(event) => onTaskTitleChange(event.target.value)}
          placeholder="E.g. Buy baby wipes"
          disabled={isLoading || isSaving || !canManageTasks}
        />

        <input
          type="date"
          value={taskDueDate}
          onChange={(event) => onTaskDueDateChange(event.target.value)}
          aria-label="Task due date"
          disabled={isLoading || isSaving || !canManageTasks}
        />

        <button
          type="button"
          onClick={onAddTask}
          disabled={!taskTitle.trim() || isLoading || isSaving || !canManageTasks}
        >
          {isSaving ? "Saving..." : "+ Add task"}
        </button>
      </div>

      <div className="timeline-filters">
        {TASK_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            className={activeFilter === filter ? "active" : ""}
            onClick={() => onFilterChange(filter)}
          >
            {filter}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p role="status" className="empty-state">
          Loading tasks...
        </p>
      ) : filteredTasks.length === 0 && error && tasks.length === 0 ? null : filteredTasks.length === 0 ? (
        <p className="empty-state">No tasks here yet.</p>
      ) : (
        <div className="task-list">
          {filteredTasks.map((task) => {
            const dueDateDisplay = getTaskDueDateDisplay(
              task.dueDate,
              task.completed,
            );

            return (
            <article className="task-item" key={task.id}>
              {editingTaskId === task.id ? (
                <div className="task-edit-form">
                  <input
                    value={editTaskTitle}
                    onChange={(event) => onEditTitleChange(event.target.value)}
                    aria-label="Edit task title"
                  />

                  <input
                    type="date"
                    value={editTaskDueDate}
                    onChange={(event) =>
                      onEditDueDateChange(event.target.value)
                    }
                    aria-label="Edit task due date"
                  />

                  <button
                    type="button"
                    className="action-button"
                    onClick={onSaveEdit}
                    disabled={isSaving || !canManageTasks}
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    className="action-button"
                    onClick={onCancelEdit}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <label className="task-details">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => onToggleComplete(task.id)}
                      disabled={isSaving || !canManageTasks}
                    />

                    <span className={task.completed ? "completed" : ""}>
                      {task.title}
                    </span>
                  </label>

                  <div className="task-actions">
                    {dueDateDisplay && (
                      <span
                        className={`task-due-date${dueDateDisplay.overdue ? " task-overdue" : ""}`}
                      >
                        {dueDateDisplay.text}
                      </span>
                    )}

                    <button
                      type="button"
                      className="action-button"
                      onClick={() => onEditRequest(task)}
                      disabled={isSaving || !canManageTasks}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="action-button delete-button"
                      onClick={() => onDelete(task.id)}
                      disabled={isSaving || !canManageTasks}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default TaskManager;
