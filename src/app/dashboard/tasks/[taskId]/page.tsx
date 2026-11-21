import TaskEditor from "../task-editor";
export const metadata = { title: "Task details | Make My Marriage" };
export default async function TaskDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ taskId: string }>;
  searchParams: Promise<{ workspace?: string }>;
}) {
  return <TaskEditor {...await params} {...await searchParams} />;
}
