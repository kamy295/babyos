import type { SleepSession } from "../../types/sleep";

const EVENTS_API_URL = "/api/events";

type SleepEventPayload = {
  content: string;
  category: "Sleep";
  eventDate: string;
  startTime: string;
  endTime: string | null;
  quantity: null;
  unit: null;
  durationMinutes: number | null;
};

type CreateSleepEventResponse = {
  event: {
    id: string;
  };
  error?: string;
};

function formatDateInIST(value: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatTimeInIST(value: string): string {
  return (
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date(value)) + ":00"
  );
}

function getDurationMinutes(startTime: string, endTime: string): number {
  const durationMs =
    new Date(endTime).getTime() - new Date(startTime).getTime();

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error("Sleep end time must be after start time.");
  }

  return Math.floor(durationMs / 60000);
}

function createPayload(
  startTime: string,
  endTime: string | null,
): SleepEventPayload {
  return {
    content: "Sleep session",
    category: "Sleep",
    eventDate: formatDateInIST(startTime),
    startTime: formatTimeInIST(startTime),
    endTime: endTime ? formatTimeInIST(endTime) : null,
    quantity: null,
    unit: null,
    durationMinutes: endTime ? getDurationMinutes(startTime, endTime) : null,
  };
}

async function getApiError(response: Response): Promise<string> {
  const result = await response.json().catch(() => null);

  return result?.error ?? "Unable to save sleep session.";
}

export async function createSleepEvent(
  startTime: string,
  endTime: string | null = null,
): Promise<SleepSession> {
  const response = await fetch(EVENTS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createPayload(startTime, endTime)),
  });

  if (!response.ok) {
    throw new Error(await getApiError(response));
  }

  const result = (await response.json()) as CreateSleepEventResponse;

  if (!result.event?.id) {
    throw new Error("The server did not return the created sleep event.");
  }

  return {
    id: result.event.id,
    startTime,
    endTime,
  };
}

export async function completeSleepEvent(
  session: SleepSession,
  endTime: string,
): Promise<SleepSession> {
  const response = await fetch(`${EVENTS_API_URL}/${session.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createPayload(session.startTime, endTime)),
  });

  if (!response.ok) {
    throw new Error(await getApiError(response));
  }

  return {
    ...session,
    endTime,
  };
}
