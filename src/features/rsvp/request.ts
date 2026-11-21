import "server-only";
import { NextRequest } from "next/server";
import { enforceAuthRateLimit } from "@/features/auth/service";
import { hashVerificationToken } from "@/features/auth/security";
import { AppError } from "@/lib/http/app-error";
import { invitationTokenSchema } from "./schemas";
export async function guardRsvpPage(token: string) {
  await enforceAuthRateLimit(
    "rsvp-page",
    "guest",
    `${hashVerificationToken(token)}:${Math.floor(Date.now() / 900000)}`,
    120,
  );
}

export async function guardRsvpRequest(
  request: NextRequest,
  token: string,
  write = false,
) {
  invitationTokenSchema.parse(token);
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
  await enforceAuthRateLimit(
    write ? "rsvp-write" : "rsvp-read",
    "guest",
    `${hashVerificationToken(token)}:${Math.floor(Date.now() / 900000)}`,
    write ? 30 : 300,
  );
}
