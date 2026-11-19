import { Hono } from "hono";
import { z } from "zod";
import {
  createFamilyNote,
  getFamilyNotes,
} from "../repositories/notes.repository";

const notes = new Hono();

const createNoteSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

notes.get("/", async (c) => {
  try {
    const data = await getFamilyNotes();

    return c.json({ notes: data });
  } catch (error) {
    console.error("Fetch family notes error:", error);

    return c.json({ error: "Unable to fetch family notes." }, 500);
  }
});

notes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const input = createNoteSchema.safeParse(body);

  if (!input.success) {
    return c.json({ error: "Please provide valid note content." }, 400);
  }

  try {
    const note = await createFamilyNote(input.data);

    return c.json({ note }, 201);
  } catch (error) {
    console.error("Create family note error:", error);

    return c.json({ error: "Unable to save your note." }, 500);
  }
});

export default notes;
