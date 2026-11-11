import "server-only";
import { z } from "zod";
import { AppError } from "@/lib/http/app-error";

const optionalSecret = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(1).optional(),
);

const baseEnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  MONGODB_URI: optionalSecret,
  MONGODB_DB_NAME: z.string().trim().min(1).default("mmm-db"),
  SESSION_SECRET: optionalSecret,
  TOKEN_HASH_SECRET: optionalSecret,
  RESEND_API_KEY: optionalSecret,
  RESEND_FROM_EMAIL: optionalSecret,
  RESEND_WEBHOOK_SECRET: optionalSecret,
  R2_ACCOUNT_ID: optionalSecret,
  R2_ACCESS_KEY_ID: optionalSecret,
  R2_SECRET_ACCESS_KEY: optionalSecret,
  R2_BUCKET_NAME: optionalSecret,
  R2_ENDPOINT: optionalSecret,
  GOOGLE_PLACES_API_KEY: optionalSecret,
  RATE_LIMIT_SECRET: optionalSecret,
});

export const environment = baseEnvironmentSchema.parse(process.env);

export function requireMongoUri(): string {
  const uri = environment.MONGODB_URI?.trim();
  if (!uri) {
    throw new AppError("MONGODB_URI is required to connect to MongoDB.", "SERVER_CONFIGURATION_ERROR", 503);
  }
  if (!uri.startsWith("mongodb://") && !uri.startsWith("mongodb+srv://")) {
    throw new AppError("MONGODB_URI must use mongodb:// or mongodb+srv://.", "SERVER_CONFIGURATION_ERROR", 503);
  }

  return uri;
}

export function requireResendConfig() {
  return z
    .object({
      apiKey: z
        .string()
        .trim()
        .min(1, "RESEND_API_KEY is required to send email"),
      fromEmail: z
        .string()
        .email("RESEND_FROM_EMAIL must be a valid email address"),
    })
    .parse({
      apiKey: environment.RESEND_API_KEY,
      fromEmail: environment.RESEND_FROM_EMAIL,
    });
}

export function requireR2Config() {
  return z
    .object({
      accountId: z.string().trim().min(1),
      accessKeyId: z.string().trim().min(1),
      secretAccessKey: z.string().trim().min(1),
      bucketName: z.string().trim().min(1),
      endpoint: z.string().url(),
    })
    .parse({
      accountId: environment.R2_ACCOUNT_ID,
      accessKeyId: environment.R2_ACCESS_KEY_ID,
      secretAccessKey: environment.R2_SECRET_ACCESS_KEY,
      bucketName: environment.R2_BUCKET_NAME,
      endpoint: environment.R2_ENDPOINT,
    });
}

export function requireGooglePlacesApiKey(): string {
  return z
    .string()
    .trim()
    .min(1, "GOOGLE_PLACES_API_KEY is required for Places search")
    .parse(environment.GOOGLE_PLACES_API_KEY);
}
