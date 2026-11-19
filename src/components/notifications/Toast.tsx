import { useEffect } from "react";
import type { Notification } from "./notification.types";

type ToastProps = {
  notification: Notification;
  onDismiss: (id: string) => void;
};

const notificationIcons = {
  success: "✓",
  error: "!",
  warning: "⚠",
  info: "i",
};

const defaultDurations = {
  success: 3500,
  error: 6000,
  warning: 5000,
  info: 3500,
};

function Toast({ notification, onDismiss }: ToastProps) {
  const duration = notification.duration ?? defaultDurations[notification.type];

  useEffect(() => {
    if (duration <= 0) return;

    const timeoutId = window.setTimeout(() => {
      onDismiss(notification.id);
    }, duration);

    return () => window.clearTimeout(timeoutId);
  }, [notification.id, duration, onDismiss]);

  return (
    <article
      className={`toast toast--${notification.type}`}
      role={notification.type === "error" ? "alert" : "status"}
      aria-live={notification.type === "error" ? "assertive" : "polite"}
    >
      <span className="toast__icon" aria-hidden="true">
        {notificationIcons[notification.type]}
      </span>

      <div className="toast__content">
        <strong className="toast__title">{notification.title}</strong>

        {notification.message && (
          <p className="toast__message">{notification.message}</p>
        )}
      </div>

      <button
        type="button"
        className="toast__close"
        onClick={() => onDismiss(notification.id)}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </article>
  );
}

export default Toast;
