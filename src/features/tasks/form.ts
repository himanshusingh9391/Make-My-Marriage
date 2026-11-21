import { createTaskSchema } from "./schemas";
export function readTaskForm(data: FormData) {
  const text = (key: string) => String(data.get(key) ?? "");
  const result = createTaskSchema.safeParse({
    title: text("title"),
    description: text("description"),
    assignedUserId: text("assignedUserId") || null,
    eventId: text("eventId") || null,
    dueDate: text("dueDate") || null,
    priority: text("priority"),
    status: text("status"),
    category: text("category"),
    notes: text("notes"),
  });
  if (!result.success)
    throw new Error(result.error.issues.map((i) => i.message).join(" "));
  return result.data;
}
