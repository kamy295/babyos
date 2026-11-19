import { supabase } from "../lib/supabase";

export async function getBabyEvents() {
  const familyId = process.env.BABYOS_DEV_FAMILY_ID;
  const babyId = process.env.BABYOS_DEV_BABY_ID;

  if (!familyId || !babyId) {
    throw new Error("Development family or baby ID is not configured.");
  }

  const { data, error } = await supabase
    .from("baby_events")
    .select(
      `
        id,
        source_note_id,
        content,
        category,
        event_date,
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
    .eq("baby_id", babyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
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
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data !== null;
}
