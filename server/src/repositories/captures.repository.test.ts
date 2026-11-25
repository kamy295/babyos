import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    rpc: mocks.rpc,
  },
}));

import { confirmFamilyCapture } from "./captures.repository";

const captureInput = {
  content: "Baby slept from 1 PM to 3 PM",
  events: [
    {
      content: "Baby slept from 1 PM to 3 PM",
      category: "Sleep" as const,
      eventDate: "2026-11-23",
      startTime: "13:00",
      endTime: "15:00",
      quantity: null,
      unit: null,
      durationMinutes: 120,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();

  vi.stubEnv("BABYOS_DEV_FAMILY_ID", "test-family-id");
  vi.stubEnv("BABYOS_DEV_BABY_ID", "test-baby-id");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("confirmFamilyCapture", () => {
  it("calls the confirmation RPC with the correct arguments", async () => {
    const rpcResult = { captureId: "capture-1" };

    mocks.rpc.mockResolvedValue({
      data: rpcResult,
      error: null,
    });

    await expect(confirmFamilyCapture(captureInput)).resolves.toEqual(
      rpcResult,
    );

    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.rpc).toHaveBeenCalledWith("confirm_family_capture", {
      p_family_id: "test-family-id",
      p_baby_id: "test-baby-id",
      p_content: captureInput.content,
      p_events: captureInput.events,
    });
  });

  it("throws when the family ID is missing", async () => {
    vi.stubEnv("BABYOS_DEV_FAMILY_ID", "");

    await expect(confirmFamilyCapture(captureInput)).rejects.toThrow(
      "Development family or baby ID is not configured.",
    );

    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("throws when the baby ID is missing", async () => {
    vi.stubEnv("BABYOS_DEV_BABY_ID", "");

    await expect(confirmFamilyCapture(captureInput)).rejects.toThrow(
      "Development family or baby ID is not configured.",
    );

    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("propagates errors returned by Supabase", async () => {
    const error = new Error("Capture confirmation failed");

    mocks.rpc.mockResolvedValue({
      data: null,
      error,
    });

    await expect(confirmFamilyCapture(captureInput)).rejects.toBe(error);
  });

  it("supports captures containing multiple events", async () => {
    const input = {
      ...captureInput,
      events: [
        ...captureInput.events,
        {
          content: "Baby was fed",
          category: "Feeding" as const,
          eventDate: "2026-11-23",
          startTime: null,
          endTime: null,
          quantity: 150,
          unit: "ml",
          durationMinutes: null,
        },
      ],
    };

    mocks.rpc.mockResolvedValue({
      data: { captureId: "capture-2" },
      error: null,
    });

    await confirmFamilyCapture(input);

    expect(mocks.rpc).toHaveBeenCalledWith(
      "confirm_family_capture",
      expect.objectContaining({
        p_events: input.events,
      }),
    );
  });

  it("resolves missing capture event dates in Kolkata and preserves per-event media URLs", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T18:30:00.000Z"));
    const input = {
      ...captureInput,
      events: [
        { ...captureInput.events[0]!, eventDate: null, mediaUrl: "https://drive.google.com/one" },
        { ...captureInput.events[0]!, eventDate: undefined, mediaUrl: "https://photos.google.com/two" },
        { ...captureInput.events[0]!, eventDate: "", mediaUrl: null },
      ],
    };
    mocks.rpc.mockResolvedValue({ data: { captureId: "capture-3" }, error: null });

    await confirmFamilyCapture(input);

    expect(mocks.rpc).toHaveBeenCalledWith(
      "confirm_family_capture",
      expect.objectContaining({
        p_events: [
          expect.objectContaining({ eventDate: "2026-01-02", mediaUrl: "https://drive.google.com/one" }),
          expect.objectContaining({ eventDate: "2026-01-02", mediaUrl: "https://photos.google.com/two" }),
          expect.objectContaining({ eventDate: "2026-01-02", mediaUrl: null }),
        ],
      }),
    );
  });
});
