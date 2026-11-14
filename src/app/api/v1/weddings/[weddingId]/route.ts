import { NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/service";
import { SESSION_COOKIE_NAME } from "@/features/auth/security";
import { getWeddingDetails, updateWeddingDetails } from "@/features/weddings/service";
import { updateWeddingSchema } from "@/features/weddings/schemas";
import { AppError } from "@/lib/http/app-error";
import { successResponse } from "@/lib/http/responses";
import { withErrorHandling } from "@/lib/http/with-error-handling";

export const runtime = "nodejs";

export const GET = withErrorHandling(async (request: NextRequest, context) => {
  const user = await getSessionUser(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!user) throw new AppError("Sign in to continue.", "UNAUTHENTICATED", 401);
  const params = await context.params;
  const weddingId = params.weddingId;
  if (typeof weddingId !== "string") throw new AppError("Wedding workspace not found.", "WEDDING_NOT_FOUND", 404);
  const data = await getWeddingDetails(user._id, weddingId);
  return successResponse(data);
});

export const PATCH = withErrorHandling(async (request: NextRequest, context) => {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if ((origin && origin !== request.nextUrl.origin) || fetchSite === "cross-site") {
    throw new AppError("This request could not be verified.", "CSRF_VALIDATION_FAILED", 403);
  }

  const user = await getSessionUser(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!user) throw new AppError("Sign in to continue.", "UNAUTHENTICATED", 401);
  const params = await context.params;
  const weddingId = params.weddingId;
  if (typeof weddingId !== "string") throw new AppError("Wedding workspace not found.", "WEDDING_NOT_FOUND", 404);
  const body: unknown = await request.json().catch(() => null);
  const input = updateWeddingSchema.parse(body);
  const data = await updateWeddingDetails(user._id, weddingId, input);
  return successResponse(data);
});
