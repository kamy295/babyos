export type NotificationType = "success" | "error" | "warning" | "info";

export type NotificationInput = {
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
};

export type Notification = NotificationInput & {
  id: string;
};
