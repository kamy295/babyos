import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirmFamilyCapture } from "../repositories/captures.repository";
import captures from "./captures";

vi.mock("../repositories/captures.repository", () => ({
  confirmFamilyCapture: vi.fn(),
}));

const app = new Hono().route("/api/captures", captures);

const validEvent = {
  content: "Baby slept for two hours",
  category: "Sleep",
  eventDate: "2026-11-23",
  startTime: "13:00",
  endTime: "15:00",
  quantity: null,
  unit: null,
  durationMinutes: 120,
};

const validPayload = {
  content: "Baby slept for two hours",
  events: [validEvent],
};

describe("POST /api/captures/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves a valid capture and returns 201", async () => {
    vi.mocked(confirmFamilyCapture).mockResolvedValue({
      id: "capture-1",
    });

    const response = await app.request("/api/captures/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      capture: { id: "capture-1" },
    });

    expect(confirmFamilyCapture).toHaveBeenCalledWith(validPayload);
  });

  it("rejects empty content", async () => {
    const response = await app.request("/api/captures/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validPayload,
        content: "",
      }),
    });

    expect(response.status).toBe(400);
    expect(confirmFamilyCapture).not.toHaveBeenCalled();
  });

  it("rejects an empty events array", async () => {
    const response = await app.request("/api/captures/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validPayload,
        events: [],
      }),
    });

    expect(response.status).toBe(400);
    expect(confirmFamilyCapture).not.toHaveBeenCalled();
  });

  it("rejects more than 20 events", async () => {
    const response = await app.request("/api/captures/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validPayload,
        events: Array(21).fill(validEvent),
      }),
    });

    expect(response.status).toBe(400);
    expect(confirmFamilyCapture).not.toHaveBeenCalled();
  });

  it("rejects an invalid event category", async () => {
    const response = await app.request("/api/captures/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validPayload,
        events: [{ ...validEvent, category: "Invalid" }],
      }),
    });

    expect(response.status).toBe(400);
    expect(confirmFamilyCapture).not.toHaveBeenCalled();
  });

  it("rejects a negative duration", async () => {
    const response = await app.request("/api/captures/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validPayload,
        events: [{ ...validEvent, durationMinutes: -10 }],
      }),
    });

    expect(response.status).toBe(400);
    expect(confirmFamilyCapture).not.toHaveBeenCalled();
  });

  it("returns 500 when persistence fails", async () => {
    vi.mocked(confirmFamilyCapture).mockRejectedValue(
      new Error("Database unavailable"),
    );

    const response = await app.request("/api/captures/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "Unable to save your capture.",
    });
  });

  it("rejects malformed JSON", async () => {
    const response = await app.request("/api/captures/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ invalid json",
    });

    expect(response.status).toBe(400);
    expect(confirmFamilyCapture).not.toHaveBeenCalled();
  });

  it("rejects requests without events", async () => {
    const response = await app.request("/api/captures/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Baby slept" }),
    });

    expect(response.status).toBe(400);
    expect(confirmFamilyCapture).not.toHaveBeenCalled();
  });

  it("rejects a decimal duration", async () => {
    const response = await app.request("/api/captures/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validPayload,
        events: [{ ...validEvent, durationMinutes: 10.5 }],
      }),
    });

    expect(response.status).toBe(400);
    expect(confirmFamilyCapture).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only event content", async () => {
    const response = await app.request("/api/captures/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validPayload,
        events: [{ ...validEvent, content: "   " }],
      }),
    });

    expect(response.status).toBe(400);
    expect(confirmFamilyCapture).not.toHaveBeenCalled();
  });

  it("rejects an invalid event date", async () => {
    const response = await app.request("/api/captures/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validPayload,
        events: [{ ...validEvent, eventDate: "not-a-date" }],
      }),
    });

    expect(response.status).toBe(400);
    expect(confirmFamilyCapture).not.toHaveBeenCalled();
  });

  it("rejects an invalid event time", async () => {
    const response = await app.request("/api/captures/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validPayload,
        events: [{ ...validEvent, startTime: "not-a-time" }],
      }),
    });

    expect(response.status).toBe(400);
    expect(confirmFamilyCapture).not.toHaveBeenCalled();
  });

  it("rejects a negative quantity", async () => {
    const response = await app.request("/api/captures/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validPayload,
        events: [{ ...validEvent, quantity: -10 }],
      }),
    });

    expect(response.status).toBe(400);
    expect(confirmFamilyCapture).not.toHaveBeenCalled();
  });
});
