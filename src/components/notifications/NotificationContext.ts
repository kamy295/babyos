import { createContext } from "react";
import type { Notification, NotificationInput } from "./notification.types";

export type NotificationContextValue = {
  notifications: Notification[];
  notify: (notification: NotificationInput) => void;
  dismiss: (id: string) => void;
};

export const NotificationContext =
  createContext<NotificationContextValue | null>(null);
