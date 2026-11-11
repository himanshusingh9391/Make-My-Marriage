import type { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/http/app-error";
import { errorResponse } from "@/lib/http/responses";
import { logger } from "@/lib/logger";

type RouteContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
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

      const errorName = error instanceof Error ? error.name : typeof error;
      const errorCode =
        typeof error === "object" && error !== null && "code" in error &&
        (typeof error.code === "string" || typeof error.code === "number")
          ? ` code=${error.code}`
          : "";
      const mongooseOperation = error instanceof Error
        ? error.message.match(/([A-Za-z0-9_.]+)\.(findOneAndUpdate|findOne|create|updateOne|deleteMany)\(\)/)
        : null;
      const safeContext = mongooseOperation ? ` operation=${mongooseOperation[1]}.${mongooseOperation[2]}` : "";
      logger.error(`Unhandled route error (${errorName}${errorCode}${safeContext})`);
      return errorResponse(
        "INTERNAL_SERVER_ERROR",
        "An unexpected error occurred.",
      );
    }
  };
}
