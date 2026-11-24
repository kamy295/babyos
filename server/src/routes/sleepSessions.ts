import { Hono } from "hono";
import { z } from "zod";
import {
  completeTrackerSleepSession,
  createTrackerSleepSession,
} from "../repositories/sleepSessions.repository";

const sleepSessions = new Hono();
const CLOCK_SKEW_TOLERANCE_MS = 2 * 60 * 1000;
const ALLOWED_DATABASE_ERROR_CODES = new Set([
  "08000",
  "08003",
  "08006",
  "22003",
  "22007",
  "22008",
  "22P02",
  "23503",
  "23505",
  "23514",
  "40001",
  "40P01",
  "42501",
  "42703",
  "42P01",
  "57014",
]);
const ACTIVE_SLEEP_INDEX_NAMES = [
  "idx_one_active_sleep_per_baby",
  "idx_one_active_tracker_sleep_per_baby",
];

function logDatabaseFailure(operation: string, error: unknown) {
  const errorClass =
    error instanceof Error &&
    ["Error", "PostgrestError", "TypeError", "RangeError"].includes(
      error.name,
    )
      ? error.name
      : "NonError";
  const rawCode =
    typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined;
  const databaseCode =
    typeof rawCode === "string" && ALLOWED_DATABASE_ERROR_CODES.has(rawCode)
      ? rawCode
      : undefined;

  console.error("Sleep tracker database operation failed.", {
    operation,
    errorClass,
    ...(databaseCode ? { databaseCode } : {}),
  });
}

const createSleepSessionSchema = z
  .object({
    startTime: z.iso.datetime(),
    endTime: z.iso.datetime().nullable(),
  })
  .strict()
  .superRefine((session, context) => {
    const latestAllowedTime = Date.now() + CLOCK_SKEW_TOLERANCE_MS;
    if (new Date(session.startTime).getTime() > latestAllowedTime) {
      context.addIssue({
        code: "custom",
        path: ["startTime"],
        message: "Sleep start time cannot be in the future.",
      });
    }

    if (
      session.endTime !== null &&
      new Date(session.endTime).getTime() <= new Date(session.startTime).getTime()
    ) {
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Sleep end time must be after start time.",
      });
    }

    if (
      session.endTime !== null &&
      new Date(session.endTime).getTime() > latestAllowedTime
    ) {
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Sleep end time cannot be in the future.",
      });
    }
  });

const completeSleepSessionSchema = z
  .object({
    endTime: z.iso.datetime(),
  })
  .strict()
  .superRefine((session, context) => {
    if (
      new Date(session.endTime).getTime() >
      Date.now() + CLOCK_SKEW_TOLERANCE_MS
    ) {
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Sleep end time cannot be in the future.",
      });
    }
  });

function isActiveSleepConflict(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;

  const code = "code" in error ? error.code : undefined;
  const message = "message" in error ? error.message : undefined;

  return (
    code === "23505" &&
    typeof message === "string" &&
    ACTIVE_SLEEP_INDEX_NAMES.some((indexName) =>
      message.includes(indexName),
    )
  );
}

sleepSessions.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const input = createSleepSessionSchema.safeParse(body);

  if (!input.success) {
    return c.json({ error: "Please provide valid sleep session times." }, 400);
  }

  try {
    const event = await createTrackerSleepSession({
      startTime: new Date(input.data.startTime),
      endTime: input.data.endTime ? new Date(input.data.endTime) : null,
    });

    return c.json({ event }, 201);
  } catch (error) {
    if (isActiveSleepConflict(error)) {
      return c.json({ error: "An active sleep session already exists." }, 409);
    }

    logDatabaseFailure("create", error);
    return c.json({ error: "Unable to create sleep session." }, 500);
  }
});

sleepSessions.patch("/:id/complete", async (c) => {
  const id = z.string().uuid().safeParse(c.req.param("id"));

  if (!id.success) {
    return c.json({ error: "Invalid sleep session ID." }, 400);
  }

  const body = await c.req.json().catch(() => null);
  const input = completeSleepSessionSchema.safeParse(body);

  if (!input.success) {
    return c.json({ error: "Please provide a valid sleep end time." }, 400);
  }

  try {
    const result = await completeTrackerSleepSession(
      id.data,
      new Date(input.data.endTime),
    );

    if (result.status === "not-found") {
      return c.json({ error: "Active tracker sleep session not found." }, 404);
    }

    if (result.status === "invalid-end-time") {
      return c.json(
        { error: "Sleep end time must be after start time." },
        400,
      );
    }

    if (result.status === "conflict") {
      return c.json({ error: "Sleep session has already been completed." }, 409);
    }

    return c.json({ message: "Sleep session completed successfully." });
  } catch (error) {
    logDatabaseFailure("complete", error);
    return c.json({ error: "Unable to complete sleep session." }, 500);
  }
});

export default sleepSessions;
