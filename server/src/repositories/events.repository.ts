import { supabase } from "../lib/supabase";

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
      `
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
        recorded_at,
        created_at
      `,
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

  const offset = (page - 1) * pageSize;
  let query = supabase
    .from("baby_events")
    .select(BABY_EVENT_COLUMNS, { count: "exact" })
    .eq("family_id", familyId)
    .eq("baby_id", babyId);

  if (category && category !== "All") {
    query = query.eq("category", category);
  }

  const { data, count, error } = await query
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("start_time", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    throw error;
  }

  return { events: data, totalRecords: count ?? 0 };
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
  eventDate: string | null;
  startTime: string | null;
  endTime: string | null;
  quantity: number | null;
  unit: string | null;
  durationMinutes: number | null;
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
      event_date: input.eventDate,
      start_time: input.startTime,
      end_time: input.endTime,
      quantity: input.quantity,
      unit: input.unit,
      duration_minutes: input.durationMinutes,
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
      event_date: input.eventDate,
      start_time: input.startTime,
      end_time: input.endTime,
      quantity: input.quantity,
      unit: input.unit,
      duration_minutes: input.durationMinutes,
    })
    .select(
      `
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
        recorded_at,
        created_at
      `,
    )
    .single();

  if (error) {
    throw error;
  }

  return data;
}
