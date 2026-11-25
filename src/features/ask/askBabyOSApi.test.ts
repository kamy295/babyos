import { afterEach, describe, expect, it, vi } from "vitest";
import { askBabyOS } from "./askBabyOSApi";

afterEach(() => vi.unstubAllGlobals());

describe("Ask BabyOS task context", () => {
  it("sends persisted task IDs and fields accepted by the backend", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({ answer: "You have one pending task." }),
    );
    vi.stubGlobal("fetch", fetcher);

    await expect(
      askBabyOS(
        "What is pending?",
        [
          {
            id: "10000000-0000-4000-8000-000000000001",
            legacyId: "7",
            title: "Buy diapers",
            dueDate: "2026-11-26",
            completed: false,
            createdAt: "2026-11-25T08:00:00.000Z",
          },
        ],
      ),
    ).resolves.toBe("You have one pending task.");

    const request = fetcher.mock.calls[0]?.[1];
    expect(JSON.parse(String(request?.body))).toEqual({
      question: "What is pending?",
      tasks: [
        {
          id: "10000000-0000-4000-8000-000000000001",
          title: "Buy diapers",
          dueDate: "2026-11-26",
          completed: false,
          createdAt: "2026-11-25T08:00:00.000Z",
        },
      ],
    });
  });
});
