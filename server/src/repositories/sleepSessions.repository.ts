import { supabase } from "../lib/supabase";

type TrackerSleepSessionInput = {
  startTime: Date;
  endTime: Date | null;
};

export type CompleteTrackerSleepSessionResult =
  | { status: "completed" }
  | { status: "not-found" }
  | { status: "invalid-end-time" }
  | { status: "conflict" };

function getDevelopmentContext() {
  const familyId = process.env.BABYOS_DEV_FAMILY_ID;
  const babyId = process.env.BABYOS_DEV_BABY_ID;

  if (!familyId || !babyId) {
    throw new Error("Development family or baby ID is not configured.");
  }

  return { familyId, babyId };
}

function formatInIST(value: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(value)
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});

  return {
    eventDate: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
  };
}

function getDurationMinutes(startTime: Date, endTime: Date): number | null {
  const durationMs = endTime.getTime() - startTime.getTime();

  if (
    !Number.isFinite(startTime.getTime()) ||
    !Number.isFinite(endTime.getTime()) ||
    durationMs <= 0
  ) {
    return null;
  }

  return Math.floor(durationMs / 60000);
}

export async function createTrackerSleepSession(
  input: TrackerSleepSessionInput,
) {
  const { familyId, babyId } = getDevelopmentContext();
  const start = formatInIST(input.startTime);
  const end = input.endTime ? formatInIST(input.endTime) : null;
  const durationMinutes = input.endTime
    ? getDurationMinutes(input.startTime, input.endTime)
    : null;

  if (input.endTime && durationMinutes === null) {
    throw new Error("Sleep end time must be after start time.");
  }

  const { data, error } = await supabase
    .from("baby_events")
    .insert({
      family_id: familyId,
      baby_id: babyId,
      source_note_id: null,
      content: "Sleep session",
      category: "Sleep",
      event_date: start.eventDate,
      end_date: end?.eventDate ?? null,
      start_time: start.time,
      end_time: end?.time ?? null,
      quantity: null,
      unit: null,
      duration_minutes: durationMinutes,
      is_tracker_session: true,
    })
    .select("id")
    .single();

  if (error) throw error;

  return data;
}

export async function completeTrackerSleepSession(
  eventId: string,
  endTime: Date,
): Promise<CompleteTrackerSleepSessionResult> {
  const { familyId, babyId } = getDevelopmentContext();

  const { data: session, error: fetchError } = await supabase
    .from("baby_events")
    .select("id, event_date, start_time")
    .eq("id", eventId)
    .eq("family_id", familyId)
    .eq("baby_id", babyId)
    .eq("category", "Sleep")
    .eq("is_tracker_session", true)
    .is("end_time", null)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!session) return { status: "not-found" };

  const startTime = new Date(
    `${session.event_date}T${session.start_time}+05:30`,
  );
  const durationMinutes = getDurationMinutes(startTime, endTime);

  if (durationMinutes === null) {
    return { status: "invalid-end-time" };
  }

  const end = formatInIST(endTime);
  const { data, error } = await supabase
    .from("baby_events")
    .update({
      end_date: end.eventDate,
      end_time: end.time,
      duration_minutes: durationMinutes,
    })
    .eq("id", eventId)
    .eq("family_id", familyId)
    .eq("baby_id", babyId)
    .eq("category", "Sleep")
    .eq("is_tracker_session", true)
    .is("end_time", null)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  if (!data) return { status: "conflict" };

  return { status: "completed" };
}
