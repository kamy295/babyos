import { Hono } from "hono";
import { z } from "zod";
import {
  createBabyEvent,
  deleteBabyEvent,
  getBabyEvents,
  updateBabyEvent,
} from "../repositories/events.repository";

const events = new Hono();

const uuidSchema = z.string().uuid();

const eventSchema = z.object({
  content: z.string().trim().min(1).max(1000),
  category: z.enum([
    "Sleep",
    "Feeding",
    "Activity",
    "Health",
    "Milestone",
    "General",
  ]),
  eventDate: z.string().date().nullable(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  durationMinutes: z.number().int().nonnegative().nullable(),
});

// GET all baby events
events.get("/", async (c) => {
  try {
    const result = await getBabyEvents();
    return c.json({ events: result });
  } catch (error) {
    console.error("Failed to fetch baby events:", error);
    return c.json({ error: "Unable to fetch baby events." }, 500);
  }
});

// CREATE a baby event
events.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsedBody = eventSchema.safeParse(body);

  if (!parsedBody.success) {
    return c.json(
      {
        error: "Invalid event data.",
        details: parsedBody.error.flatten(),
      },
      400,
    );
  }

  try {
    const result = await createBabyEvent(parsedBody.data);

    return c.json({ event: result }, 201);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505" &&
      "message" in error &&
      typeof error.message === "string" &&
      error.message.includes("idx_one_active_sleep_per_baby")
    ) {
      return c.json({ error: "An active sleep session already exists." }, 409);
    }

    console.error("Failed to create baby event:", error);
    return c.json({ error: "Unable to create baby event." }, 500);
  }
});

// DELETE a baby event
events.delete("/:id", async (c) => {
  const parsedId = uuidSchema.safeParse(c.req.param("id"));

  if (!parsedId.success) {
    return c.json({ error: "Invalid event ID." }, 400);
  }

  try {
    const deleted = await deleteBabyEvent(parsedId.data);

    if (!deleted) {
      return c.json({ error: "Event not found." }, 404);
    }

    return c.json({ message: "Event deleted successfully." });
  } catch (error) {
    console.error("Failed to delete baby event:", error);
    return c.json({ error: "Unable to delete baby event." }, 500);
  }
});

events.patch("/:id", async (c) => {
  const parsedId = uuidSchema.safeParse(c.req.param("id"));

  if (!parsedId.success) {
    return c.json({ error: "Invalid event ID." }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const parsedBody = eventSchema.safeParse(body);

  if (!parsedBody.success) {
    return c.json(
      {
        error: "Invalid event data.",
        details: parsedBody.error.flatten(),
      },
      400,
    );
  }

  try {
    const updated = await updateBabyEvent(parsedId.data, parsedBody.data);

    if (!updated) {
      return c.json({ error: "Event not found." }, 404);
    }

    return c.json({ message: "Event updated successfully." });
  } catch (error) {
    console.error("Failed to update baby event:", error);
    return c.json({ error: "Unable to update baby event." }, 500);
  }
});

export default events;
