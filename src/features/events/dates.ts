/** Format and convert wall-clock inputs in the wedding timezone, never the browser timezone. */
export function localDateTime(iso: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function toInstant(local: string, timezone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))
    throw new Error("Enter a complete date and time.");
  const target = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(target)) throw new Error("Enter a valid date and time.");
  let candidate = target;
  for (let attempt = 0; attempt < 4; attempt++) {
    const rendered = localDateTime(new Date(candidate).toISOString(), timezone);
    if (rendered === local) return new Date(candidate).toISOString();
    candidate += target - Date.parse(`${rendered}:00Z`);
  }
  throw new Error(
    "This date and time does not exist in the wedding timezone. Choose another time.",
  );
}
