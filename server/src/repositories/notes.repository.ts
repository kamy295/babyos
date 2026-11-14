import { supabase } from "../lib/supabase";

export type CreateNoteInput = {
  content: string;
};

export type FamilyNoteRecord = {
  id: string;
  content: string;
  createdAt: string;
};

function getDevelopmentContext() {
  const familyId = process.env.BABYOS_DEV_FAMILY_ID;
  const babyId = process.env.BABYOS_DEV_BABY_ID;

  if (!familyId || !babyId) {
    throw new Error("Development family or baby ID is not configured.");
  }

  return { familyId, babyId };
}

export async function getFamilyNotes(): Promise<FamilyNoteRecord[]> {
  const { familyId, babyId } = getDevelopmentContext();

  const { data, error } = await supabase
    .from("family_notes")
    .select("id, content, created_at")
    .eq("family_id", familyId)
    .eq("baby_id", babyId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data.map((note) => ({
    id: note.id,
    content: note.content,
    createdAt: note.created_at,
  }));
}

export async function createFamilyNote(
  input: CreateNoteInput,
): Promise<FamilyNoteRecord> {
  const { familyId, babyId } = getDevelopmentContext();

  const { data, error } = await supabase
    .from("family_notes")
    .insert({
      family_id: familyId,
      baby_id: babyId,
      content: input.content,
    })
    .select("id, content, created_at")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id,
    content: data.content,
    createdAt: data.created_at,
  };
}
