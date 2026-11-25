import { supabase } from "../lib/supabase";
import { resolveEventDate } from "../utils/eventDate";

const BABY_EVENT_COLUMNS = `
  id,
  source_note_id,
  is_tracker_session,
  content,
  category,
  event_date,
  end_date,
  start_time,
  end_time,
  quantity,
  unit,
  duration_minutes,
  media_url,
  recorded_at,
  created_at
`;

export async function getBabyEvents(category?: string) {
  const familyId = process.env.BABYOS_DEV_FAMILY_ID;
  const babyId = process.env.BABYOS_DEV_BABY_ID;

  if (!familyId || !babyId) {
    throw new Error("Development family or baby ID is not configured.");
  }

  let query = supabase
    .from("baby_events")
    .select(
      BABY_EVENT_COLUMNS,
    )
    .eq("family_id", familyId)
    .eq("baby_id", babyId);

  if (category && category !== "All") {
    query = query.eq("category", category);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function getBabyEventsPage(
  page: number,
  pageSize: number,
  category?: string,
) {
  const familyId = process.env.BABYOS_DEV_FAMILY_ID;
  const babyId = process.env.BABYOS_DEV_BABY_ID;

  if (!familyId || !babyId) {
    throw new Error("Development family or baby ID is not configured.");
  }

  const { data, error } = await supabase.rpc("get_baby_events_page", {
    p_family_id: familyId,
    p_baby_id: babyId,
    p_page: page,
    p_page_size: pageSize,
    p_category: category && category !== "All" ? category : null,
  });

  if (error) {
    throw error;
  }

  const result = data as { events: unknown[]; totalRecords: number };
  return { events: result.events, totalRecords: result.totalRecords };
}

export async function deleteBabyEvent(eventId: string) {
  const familyId = process.env.BABYOS_DEV_FAMILY_ID;
  const babyId = process.env.BABYOS_DEV_BABY_ID;

  if (!familyId || !babyId) {
    throw new Error("Development family or baby ID is not configured.");
  }

  const { data, error } = await supabase
    .from("baby_events")
    .delete()
    .eq("id", eventId)
    .eq("family_id", familyId)
    .eq("baby_id", babyId)
    .select("id");

  if (error) {
    throw error;
  }

  return data.length > 0;
}

export type UpdateBabyEventInput = {
  content: string;
  category:
    | "Sleep"
    | "Feeding"
    | "Activity"
    | "Health"
    | "Milestone"
    | "General";
  eventDate?: string | null;
  startTime: string | null;
  endTime: string | null;
  quantity: number | null;
  unit: string | null;
  durationMinutes: number | null;
  mediaUrl?: string | null;
};

export async function updateBabyEvent(
  eventId: string,
  input: UpdateBabyEventInput,
) {
  const familyId = process.env.BABYOS_DEV_FAMILY_ID;
  const babyId = process.env.BABYOS_DEV_BABY_ID;

  if (!familyId || !babyId) {
    throw new Error("Development family or baby ID is not configured.");
  }

  const { data, error } = await supabase
    .from("baby_events")
    .update({
      content: input.content,
      category: input.category,
      ...(input.eventDate !== undefined ? { event_date: input.eventDate } : {}),
      start_time: input.startTime,
      end_time: input.endTime,
      quantity: input.quantity,
      unit: input.unit,
      duration_minutes: input.durationMinutes,
      ...(input.mediaUrl !== undefined
        ? { media_url: input.mediaUrl }
        : {}),
    })
    .eq("id", eventId)
    .eq("family_id", familyId)
    .eq("baby_id", babyId)
    .eq("is_tracker_session", false)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data !== null;
}

export async function createBabyEvent(input: UpdateBabyEventInput) {
  const familyId = process.env.BABYOS_DEV_FAMILY_ID;
  const babyId = process.env.BABYOS_DEV_BABY_ID;

  if (!familyId || !babyId) {
    throw new Error("Development family or baby ID is not configured.");
  }

  const { data, error } = await supabase
    .from("baby_events")
    .insert({
      family_id: familyId,
      baby_id: babyId,
      source_note_id: null,
      content: input.content,
      category: input.category,
      event_date: resolveEventDate(input.eventDate),
      start_time: input.startTime,
      end_time: input.endTime,
      quantity: input.quantity,
      unit: input.unit,
      duration_minutes: input.durationMinutes,
      media_url: input.mediaUrl ?? null,
    })
    .select(BABY_EVENT_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data;
}
