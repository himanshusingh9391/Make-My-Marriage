import { NextRequest } from "next/server";
import { requireSessionRequest } from "@/lib/http/session-request";
import {
  createTaskSchema,
  taskIdSchema,
  taskQuerySchema,
} from "@/features/tasks/schemas";
import { createTask, listTasks } from "@/features/tasks/service";
import { withErrorHandling } from "@/lib/http/with-error-handling";
import { successResponse } from "@/lib/http/responses";
export const runtime = "nodejs";
type Context = { params: Promise<{ weddingId: string }> };
export const GET = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await requireSessionRequest(request);
    const weddingId = taskIdSchema.parse((await context.params).weddingId);
    const query = taskQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    return successResponse(await listTasks(user._id, weddingId, query));
  },
);
export const POST = withErrorHandling(
  async (request: NextRequest, context: Context) => {
    const user = await requireSessionRequest(request, true);
    const weddingId = taskIdSchema.parse((await context.params).weddingId);
    const input = createTaskSchema.parse(
      await request.json().catch(() => null),
    );
    return successResponse(await createTask(user._id, weddingId, input), 201);
  },
);
