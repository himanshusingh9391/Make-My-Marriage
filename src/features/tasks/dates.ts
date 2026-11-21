export function weddingToday(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
export function isTaskOverdue(
  dueDate: string | null,
  status: string,
  today: string,
) {
  return Boolean(
    dueDate &&
    dueDate < today &&
    status !== "COMPLETED" &&
    status !== "CANCELLED",
  );
}
export function formatTaskDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    dateStyle: "medium",
  }).format(new Date(`${date}T12:00:00Z`));
}
