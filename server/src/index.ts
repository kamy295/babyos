/// <reference types="node" />
import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { supabase } from "./lib/supabase";
import notes from "./routes/notes";
import captures from "./routes/captures";
import { cors } from "hono/cors";
import events from "./routes/events";
import aiRoutes from "./routes/ai";
import sleepSessions from "./routes/sleepSessions";

const app = new Hono();

app.use(
  "/api/*",
  cors({
    origin: "http://localhost:5173",
    allowMethods: ["GET", "POST", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

app.get("/api/health", (c) => {
  return c.json({
    status: "ok",
    message: "BabyOS backend is running",
  });
});

app.route("/api/notes", notes);
app.route("/api/captures", captures);
app.route("/api/events", events);
app.route("/api/sleep-sessions", sleepSessions);
app.route("/api/ai", aiRoutes);

app.get("/api/health/database", async (c) => {
  const familyId = process.env.BABYOS_DEV_FAMILY_ID;
  const babyId = process.env.BABYOS_DEV_BABY_ID;

  if (!familyId || !babyId) {
    return c.json(
      { status: "error", message: "Development IDs are not configured." },
      500,
    );
  }

  try {
    const { data: family, error: familyError } = await supabase
      .from("families")
      .select("id, name")
      .eq("id", familyId)
      .single();

    if (familyError) throw familyError;

    const { data: baby, error: babyError } = await supabase
      .from("babies")
      .select("id, name")
      .eq("id", babyId)
      .eq("family_id", familyId)
      .single();

    if (babyError) throw babyError;

    return c.json({
      status: "ok",
      message: "Supabase connection successful.",
      family: family.name,
      baby: baby.name,
    });
  } catch (error) {
    console.error("Supabase database health check failed:", error);

    return c.json(
      { status: "error", message: "Unable to query Supabase." },
      500,
    );
  }
});

const port = Number(process.env.PORT ?? 3000);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`BabyOS backend running on http://localhost:${info.port}`);
  },
);
