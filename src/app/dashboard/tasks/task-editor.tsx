import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/http/app-error";
import { getTask, taskOptions } from "@/features/tasks/service";
import { taskIdSchema } from "@/features/tasks/schemas";
import {
  loadPlanningWorkspace,
  PlanningWorkspace,
} from "../components/planning-workspace";
import { PlanningHeading } from "../components/planning-form";
import TaskForm from "./task-form";
import common from "../events/events.module.css";
export default async function TaskEditor({
  workspace,
  taskId,
  eventId,
}: {
  workspace?: string;
  taskId?: string;
  eventId?: string;
}) {
  const context = await loadPlanningWorkspace(workspace);
  const weddingId = context.dashboard.wedding.id;
  const options = await taskOptions(context.user._id, weddingId);
  let task;
  if (taskId) {
    if (!taskIdSchema.safeParse(taskId).success) notFound();
    try {
      task = await getTask(context.user._id, weddingId, taskId);
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) notFound();
      throw error;
    }
  }
  const readOnly = context.dashboard.wedding.status === "ARCHIVED";
  return (
    <PlanningWorkspace context={context} title="Tasks" active="tasks">
      <Link
        href={`/dashboard/tasks?workspace=${weddingId}`}
        className={common.back}
      >
        ← Back to tasks
      </Link>
      <PlanningHeading
        eyebrow="PLANNING TOGETHER"
        title={task ? "Task details" : "Add a task"}
        description="Make the next step clear for everyone."
      />
      {readOnly && (
        <p className={common.notice}>
          This wedding is archived. Tasks are read-only.
        </p>
      )}
      <TaskForm
        key={task?.id ?? "new"}
        weddingId={weddingId}
        options={options}
        task={task}
        readOnly={readOnly}
        initialEventId={
          options.events.some((e) => e.id === eventId) ? eventId : undefined
        }
      />
    </PlanningWorkspace>
  );
}
