import type { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/http/app-error";
import { errorResponse } from "@/lib/http/responses";
import { logger } from "@/lib/logger";

type RouteContext = {
  params?: Promise<Record<string, string | string[] | undefined>>;
};

type RouteHandler<Context extends RouteContext = RouteContext> = (
  request: NextRequest,
  context: Context,
) => Promise<NextResponse>;

export function withErrorHandling<Context extends RouteContext = RouteContext>(
  handler: RouteHandler<Context>,
): RouteHandler<Context> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof AppError) {
        return errorResponse(error.code, error.message, error.statusCode);
      }

      if (error instanceof ZodError) {
        return errorResponse(
          "VALIDATION_ERROR",
          "Invalid request data",
          400,
          error.issues.map(({ code, message, path }) => ({
            code,
            message,
            path: path.join("."),
          })),
        );
      }

      logger.error("Unhandled route error");
      return errorResponse(
        "INTERNAL_SERVER_ERROR",
        "An unexpected error occurred.",
      );
    }
  };
}
