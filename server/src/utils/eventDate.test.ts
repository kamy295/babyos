import { describe, expect, it } from "vitest";
import { getTodayInKolkata, resolveEventDate } from "./eventDate";

describe("Kolkata event date resolution", () => {
  it("preserves an explicit event date", () => {
    expect(resolveEventDate("2024-02-29", new Date("2026-01-01T18:30:00Z"))).toBe(
      "2024-02-29",
    );
  });

  it.each([null, undefined, ""])(
    "defaults eventDate %s to today's Kolkata date",
    (eventDate) => {
      expect(
        resolveEventDate(eventDate, new Date("2026-01-01T18:30:00Z")),
      ).toBe("2026-01-02");
    },
  );

  it("uses the Kolkata calendar date on both sides of its UTC midnight boundary", () => {
    expect(getTodayInKolkata(new Date("2026-01-01T18:29:59.999Z"))).toBe(
      "2026-01-01",
    );
    expect(getTodayInKolkata(new Date("2026-01-01T18:30:00.000Z"))).toBe(
      "2026-01-02",
    );
  });
});
