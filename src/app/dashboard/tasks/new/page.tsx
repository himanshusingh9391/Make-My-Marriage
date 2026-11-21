import TaskEditor from "../task-editor";
export const metadata = { title: "Add a task | Make My Marriage" };
export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string; eventId?: string }>;
}) {
  return <TaskEditor {...await searchParams} />;
}
