import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { environment } from "@/lib/env/env";
import { AppError } from "@/lib/http/app-error";

export const SESSION_COOKIE_NAME = "mmm_session";
export const REMEMBERED_SESSION_DAYS = 30;

function hmac(value: string, secret: string | undefined, purpose: string): string {
  if (!secret) {
    throw new AppError(`${purpose} is not configured.`, "SERVER_CONFIGURATION_ERROR", 503);
  }

  return createHmac("sha256", secret).update(value).digest("hex");
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return hmac(token, environment.SESSION_SECRET, "Session security");
}

export function createVerificationToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashVerificationToken(token: string): string {
  return hmac(token, environment.TOKEN_HASH_SECRET, "Token security");
}

export function createWeddingSlug(label: string): string {
  const base = label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "wedding";

  return `${base}-${randomBytes(4).toString("hex")}`;
}
