import { afterEach, describe, expect, it, vi } from "vitest";
import { generateWithRetry } from "./ai";

afterEach(() => {
  vi.useRealTimers();
});

describe("generateWithRetry", () => {
  it("retries a transient 503 error and succeeds", async () => {
    vi.useFakeTimers();

    const operation = vi
      .fn()
      .mockRejectedValueOnce({ status: 503 })
      .mockResolvedValueOnce("success");

    const result = generateWithRetry(operation);

    await vi.advanceTimersByTimeAsync(1000);

    await expect(result).resolves.toBe("success");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("does not retry a non-retryable 400 error", async () => {
    const error = Object.assign(new Error("Bad request"), {
      status: 400,
    });

    const operation = vi.fn().mockRejectedValue(error);

    await expect(generateWithRetry(operation)).rejects.toBe(error);

    expect(operation).toHaveBeenCalledOnce();
  });

  it("does not retry when Gemini quota is exceeded", async () => {
    const error = new Error("Quota exceeded for this API");

    const operation = vi.fn().mockRejectedValue(error);

    await expect(generateWithRetry(operation)).rejects.toBe(error);

    expect(operation).toHaveBeenCalledOnce();
  });

  it("stops after three attempts with 1s and 2s delays", async () => {
    vi.useFakeTimers();

    const error = Object.assign(new Error("Service unavailable"), {
      status: 503,
    });

    const operation = vi.fn().mockRejectedValue(error);

    const result = generateWithRetry(operation);
    const rejection = expect(result).rejects.toBe(error);

    // Initial attempt happens immediately.
    expect(operation).toHaveBeenCalledTimes(1);

    // First retry after 1 second.
    await vi.advanceTimersByTimeAsync(1000);
    expect(operation).toHaveBeenCalledTimes(2);

    // No retry before the second delay completes.
    await vi.advanceTimersByTimeAsync(1999);
    expect(operation).toHaveBeenCalledTimes(2);

    // Third and final attempt after another 2 seconds.
    await vi.advanceTimersByTimeAsync(1);

    await rejection;
    expect(operation).toHaveBeenCalledTimes(3);
  });
});
