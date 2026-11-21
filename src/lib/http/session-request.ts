import "server-only";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/features/auth/service";
import { SESSION_COOKIE_NAME } from "@/features/auth/security";
import { AppError } from "@/lib/http/app-error";

export async function requireSessionRequest(
  request: NextRequest,
  write = false,
) {
  if (
    write &&
    ((request.headers.get("origin") &&
      request.headers.get("origin") !== request.nextUrl.origin) ||
      request.headers.get("sec-fetch-site") === "cross-site")
  )
    throw new AppError(
      "This request could not be verified.",
      "CSRF_VALIDATION_FAILED",
      403,
    );
  const user = await getSessionUser(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!user) throw new AppError("Sign in to continue.", "UNAUTHENTICATED", 401);
  return user;
}
