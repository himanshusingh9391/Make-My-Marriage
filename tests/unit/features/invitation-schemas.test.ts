import { describe, expect, it } from "vitest";
import { createWeddingInvitationSchema, invitationTokenSchema } from "@/features/weddings/invitation-schemas";

describe("wedding invitation schemas", () => {
  it("accepts an email and a supported workspace role", () => {
    expect(createWeddingInvitationSchema.parse({ email: "planner@example.com", role: "MANAGER" })).toEqual({
      email: "planner@example.com",
      role: "MANAGER",
    });
  });

  it("rejects unsupported roles, malformed email, and extra fields", () => {
    expect(createWeddingInvitationSchema.safeParse({ email: "planner@example.com", role: "OWNER" }).success).toBe(false);
    expect(createWeddingInvitationSchema.safeParse({ email: "not-an-email", role: "ADMIN" }).success).toBe(false);
    expect(createWeddingInvitationSchema.safeParse({ email: "planner@example.com", role: "ADMIN", weddingId: "other" }).success).toBe(false);
  });

  it("requires a sufficiently long opaque invitation token", () => {
    expect(invitationTokenSchema.safeParse({ token: "a".repeat(32) }).success).toBe(true);
    expect(invitationTokenSchema.safeParse({ token: "short" }).success).toBe(false);
    expect(invitationTokenSchema.safeParse({ token: "a".repeat(32), weddingId: "untrusted" }).success).toBe(false);
  });
});
