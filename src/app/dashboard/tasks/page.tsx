import Link from "next/link";
import { notFound } from "next/navigation";
import {
  loadPlanningWorkspace,
  PlanningWorkspace,
} from "../components/planning-workspace";
import { PlanningHeading } from "../components/planning-form";
import { taskQuerySchema } from "@/features/tasks/schemas";
import { listTasks, taskOptions } from "@/features/tasks/service";
import TaskList from "./task-list";
import common from "../events/events.module.css";
export const metadata = { title: "Tasks | Make My Marriage" };
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (params.workspace && typeof params.workspace !== "string") notFound();
  const context = await loadPlanningWorkspace(params.workspace);
  const raw = Object.fromEntries(
    ["tab", "status", "priority", "eventId", "assignedUserId", "page"]
      .filter((key) => params[key] !== undefined && params[key] !== "")
      .map((key) => [key, params[key]]),
  );
  const parsed = taskQuerySchema.safeParse(raw);
  if (!parsed.success) notFound();
  const weddingId = context.dashboard.wedding.id;
  const [data, options] = await Promise.all([
    listTasks(context.user._id, weddingId, parsed.data),
    taskOptions(context.user._id, weddingId),
  ]);
  const readOnly = context.dashboard.wedding.status === "ARCHIVED";
  return (
    <PlanningWorkspace context={context} title="Tasks" active="tasks">
      <PlanningHeading
        eyebrow="PLANNING / TASKS"
        title="Wedding tasks"
        description="Bring your people and plans together, one task at a time."
        action={
          !readOnly && (
            <Link
              className={common.primary}
              href={`/dashboard/tasks/new?workspace=${weddingId}`}
            >
              + Add task
            </Link>
          )
        }
      />
      {readOnly && (
        <p className={common.notice}>
          This wedding is archived. Tasks are available to view only.
        </p>
      )}
      <TaskList
        key={`${weddingId}-${JSON.stringify(parsed.data)}`}
        data={data}
        options={options}
        query={parsed.data}
        weddingId={weddingId}
        readOnly={readOnly}
        saved={params.saved === "1"}
      />
    </PlanningWorkspace>
  );
}
