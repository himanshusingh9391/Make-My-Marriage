import { NextRequest } from "next/server";
import { requireSessionRequest } from "@/lib/http/session-request";
import { taskParamsSchema, updateTaskSchema } from "@/features/tasks/schemas";
import { getTask, updateTask, deleteTask } from "@/features/tasks/service";
import { withErrorHandling } from "@/lib/http/with-error-handling";
import { successResponse } from "@/lib/http/responses";
export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string; taskId: string }> };
export const GET = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await requireSessionRequest(request);
    const { weddingId, taskId } = taskParamsSchema.parse(await context.params);
    return successResponse(await getTask(user._id, weddingId, taskId));
  },
);
export const PATCH = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await requireSessionRequest(request, true);
    const { weddingId, taskId } = taskParamsSchema.parse(await context.params);
    const input = updateTaskSchema.parse(
      await request.json().catch(() => null),
    );
    return successResponse(
      await updateTask(user._id, weddingId, taskId, input),
    );
  },
);
export const DELETE = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await requireSessionRequest(request, true);
    const { weddingId, taskId } = taskParamsSchema.parse(await context.params);
    return successResponse(await deleteTask(user._id, weddingId, taskId));
  },
);
