import { Hono } from "hono";
import { z } from "zod";
import { confirmFamilyCapture } from "../repositories/captures.repository";
import { optionalMediaUrlSchema } from "../schemas/mediaUrl";

const captures = new Hono();

const eventSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  category: z.enum([
    "Sleep",
    "Feeding",
    "Activity",
    "Health",
    "Milestone",
    "General",
  ]),
  eventDate: z.union([z.iso.date(), z.literal(""), z.null()]).optional(),
  startTime: z.iso.time({ precision: -1 }).nullable(),
  endTime: z.iso.time({ precision: -1 }).nullable(),
  quantity: z.number().nonnegative().nullable(),
  unit: z.string().nullable(),
  durationMinutes: z.number().int().nonnegative().nullable(),
  mediaUrl: optionalMediaUrlSchema,
});

const confirmCaptureSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  events: z.array(eventSchema).min(1).max(20),
});

captures.post("/confirm", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = confirmCaptureSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Please provide valid note content and events." },
      400,
    );
  }

  try {
    const result = await confirmFamilyCapture(parsed.data);
    return c.json({ capture: result }, 201);
  } catch (error) {
    console.error("Confirm family capture error:", error);
    return c.json({ error: "Unable to save your capture." }, 500);
  }
});

export default captures;
