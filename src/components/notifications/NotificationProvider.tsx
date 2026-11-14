import { useCallback, useState, type ReactNode } from "react";

import { NotificationContext } from "./NotificationContext";
import type { Notification, NotificationInput } from "./notification.types";

type NotificationProviderProps = {
  children: ReactNode;
};

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const dismiss = useCallback((id: string) => {
    setNotifications((current) =>
      current.filter((notification) => notification.id !== id),
    );
  }, []);

  const notify = useCallback((notification: NotificationInput) => {
    const id = crypto.randomUUID();

    setNotifications((current) => [...current, { ...notification, id }]);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, notify, dismiss }}>
      {children}
    </NotificationContext.Provider>
  );
}
