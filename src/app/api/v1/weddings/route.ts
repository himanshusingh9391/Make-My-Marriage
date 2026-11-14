import { NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/service";
import { SESSION_COOKIE_NAME } from "@/features/auth/security";
import { createInitialWedding } from "@/features/weddings/service";
import { createWeddingSchema } from "@/features/weddings/schemas";
import { AppError } from "@/lib/http/app-error";
import { successResponse } from "@/lib/http/responses";
import { withErrorHandling } from "@/lib/http/with-error-handling";

export const runtime = "nodejs";

export const POST = withErrorHandling(async (request: NextRequest) => {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if ((origin && origin !== request.nextUrl.origin) || fetchSite === "cross-site") {
    throw new AppError("This request could not be verified.", "CSRF_VALIDATION_FAILED", 403);
  }

  const user = await getSessionUser(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!user) throw new AppError("Sign in to continue.", "UNAUTHENTICATED", 401);
  const body: unknown = await request.json().catch(() => null);
  const input = createWeddingSchema.parse(body);
  const data = await createInitialWedding(user._id, input);
  return successResponse(data, 201);
});
