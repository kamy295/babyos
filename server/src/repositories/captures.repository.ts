import { supabase } from "../lib/supabase";

export type ConfirmCaptureInput = {
  content: string;
  events: {
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
  }[];
};

export async function confirmFamilyCapture(input: ConfirmCaptureInput) {
  const familyId = process.env.BABYOS_DEV_FAMILY_ID;
  const babyId = process.env.BABYOS_DEV_BABY_ID;

  if (!familyId || !babyId) {
    throw new Error("Development family or baby ID is not configured.");
  }

  const { data, error } = await supabase.rpc("confirm_family_capture", {
    p_family_id: familyId,
    p_baby_id: babyId,
    p_content: input.content,
    p_events: input.events,
  });

  if (error) {
    throw error;
  }

  return data;
}
