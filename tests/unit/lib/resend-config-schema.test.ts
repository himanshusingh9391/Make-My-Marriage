import { describe, expect, it } from "vitest";
import {
  isResendTestingSender,
  resendConfigSchema,
} from "@/lib/env/resend-config-schema";

describe("Resend configuration schema", () => {
  const apiKey = "re_test_key";

  it("accepts a plain sender address", () => {
    expect(
      resendConfigSchema.safeParse({ apiKey, fromEmail: "hello@example.com" })
        .success,
    ).toBe(true);
  });

  it("accepts a display name with a sender address", () => {
    expect(
      resendConfigSchema.safeParse({
        apiKey,
        fromEmail: "Make My Marriage <hello@example.com>",
      }).success,
    ).toBe(true);
  });

  it("rejects malformed or multiline sender values", () => {
    expect(
      resendConfigSchema.safeParse({
        apiKey,
        fromEmail: "Make My Marriage <not-an-email>",
      }).success,
    ).toBe(false);
    expect(
      resendConfigSchema.safeParse({
        apiKey,
        fromEmail: "hello@example.com\nBcc: attacker@example.com",
      }).success,
    ).toBe(false);
  });

  it("identifies Resend's shared testing sender domain", () => {
    expect(isResendTestingSender("onboarding@resend.dev")).toBe(true);
    expect(
      isResendTestingSender("Make My Marriage <onboarding@resend.dev>"),
    ).toBe(true);
    expect(isResendTestingSender("Make My Marriage <hello@example.com>")).toBe(
      false,
    );
  });
});
