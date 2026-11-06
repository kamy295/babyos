import { TASK_FILTERS, type Task, type TaskFilter } from "../../types/tasks";
import "./TaskManager.css";

type TaskManagerProps = {
  tasks: Task[];
  taskTitle: string;
  taskDueDate: string;
  activeFilter: TaskFilter;
  onTaskTitleChange: (value: string) => void;
  onTaskDueDateChange: (value: string) => void;
  onAddTask: () => void;
  onFilterChange: (filter: TaskFilter) => void;
  onToggleComplete: (id: number) => void;
  editingTaskId: number | null;
  editTaskTitle: string;
  editTaskDueDate: string;
  onEditRequest: (task: Task) => void;
  onEditTitleChange: (value: string) => void;
  onEditDueDateChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: number) => void;
};

function TaskManager({
  tasks,
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

      <div className="task-form">
        <input
          type="text"
          value={taskTitle}
          onChange={(event) => onTaskTitleChange(event.target.value)}
          placeholder="E.g. Buy baby wipes"
        />

        <input
          type="date"
          value={taskDueDate}
          onChange={(event) => onTaskDueDateChange(event.target.value)}
          aria-label="Task due date"
        />

        <button type="button" onClick={onAddTask} disabled={!taskTitle.trim()}>
          + Add task
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

      {filteredTasks.length === 0 ? (
        <p className="empty-state">No tasks here yet.</p>
      ) : (
        <div className="task-list">
          {filteredTasks.map((task) => (
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
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    className="action-button"
                    onClick={onCancelEdit}
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
                    />

                    <span className={task.completed ? "completed" : ""}>
                      {task.title}
                    </span>
                  </label>

                  <div className="task-actions">
                    {task.dueDate && (
                      <span className="task-due-date">Due: {task.dueDate}</span>
                    )}

                    <button
                      type="button"
                      className="action-button"
                      onClick={() => onEditRequest(task)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="action-button"
                      onClick={() => onDelete(task.id)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default TaskManager;
