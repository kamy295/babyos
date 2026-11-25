export function getTodayInKolkata(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to determine the current Kolkata date.");
  }

  return `${year}-${month}-${day}`;
}

export function resolveEventDate(
  eventDate: string | null | undefined,
  now = new Date(),
): string {
  return eventDate === null || eventDate === undefined || eventDate === ""
    ? getTodayInKolkata(now)
    : eventDate;
}
