import { describe, expect, it } from "vitest";
import {
  isValidOptionalHttpUrl,
  normalizeOptionalHttpUrl,
} from "./mediaUrl";

describe("optional media URLs", () => {
  it.each([
    "https://photos.google.com/share/example",
    "http://example.com/video",
  ])("accepts HTTP(S) URL %s", (value) => {
    expect(isValidOptionalHttpUrl(value)).toBe(true);
    expect(normalizeOptionalHttpUrl(value)).toBe(value);
  });

  it.each(["", "  "])("normalizes empty values to null", (value) => {
    expect(isValidOptionalHttpUrl(value)).toBe(true);
    expect(normalizeOptionalHttpUrl(value)).toBeNull();
  });

  it.each(["not a URL", "ftp://example.com/file", "javascript:alert(1)"])(
    "rejects invalid value %s",
    (value) => {
      expect(isValidOptionalHttpUrl(value)).toBe(false);
      expect(() => normalizeOptionalHttpUrl(value)).toThrow(
        "Enter a valid HTTP or HTTPS URL.",
      );
    },
  );
});
