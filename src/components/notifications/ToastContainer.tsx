import { useNotification } from "./useNotification";
import Toast from "./Toast";
import "./notification.css";

function ToastContainer() {
  const { notifications, dismiss } = useNotification();

  return (
    <div className="toast-container">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onDismiss={dismiss}
        />
      ))}
    </div>
  );
}

export default ToastContainer;
