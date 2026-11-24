import type { SleepSession } from "../../types/sleep";

const SLEEP_SESSIONS_API_URL = "/api/sleep-sessions";

type CreateSleepEventResponse = {
  event: {
    id: string;
  };
  error?: string;
};

async function getApiError(response: Response): Promise<string> {
  const result = await response.json().catch(() => null);

  return result?.error ?? "Unable to save sleep session.";
}

export async function createSleepEvent(
  startTime: string,
  endTime: string | null = null,
): Promise<SleepSession> {
  const response = await fetch(SLEEP_SESSIONS_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ startTime, endTime }),
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
  const response = await fetch(
    `${SLEEP_SESSIONS_API_URL}/${session.id}/complete`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ endTime }),
    },
  );

  if (!response.ok) {
    throw new Error(await getApiError(response));
  }

  return {
    ...session,
    endTime,
  };
}
