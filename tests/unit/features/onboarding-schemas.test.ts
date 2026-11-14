import { describe, expect, it } from "vitest";
import { registerSchema } from "@/features/auth/schemas";
import { createWeddingSchema, updateWeddingSchema } from "@/features/weddings/schemas";

describe("account registration schema", () => {
  it("accepts only full name, email, and password", () => {
    expect(registerSchema.safeParse({
      fullName: "Ananya Sen",
      email: "ananya@example.com",
      password: "StrongPassword123!",
    }).success).toBe(true);
  });

  it("rejects wedding details during registration", () => {
    expect(registerSchema.safeParse({
      fullName: "Ananya Sen",
      email: "ananya@example.com",
      password: "StrongPassword123!",
      city: "Jaipur",
    }).success).toBe(false);
  });
});

describe("first wedding setup schema", () => {
  it("accepts couple and place details without requiring a date", () => {
    expect(createWeddingSchema.safeParse({
      title: "Ananya and Vikram’s Wedding",
      description: "A celebration with family and friends.",
      partnerOneName: "Ananya Sen",
      partnerTwoName: "Vikram Rao",
      city: "Jaipur",
    }).success).toBe(true);
  });

  it("requires both names and a place", () => {
    expect(createWeddingSchema.safeParse({ title: "Our Wedding", partnerOneName: "Ananya Sen" }).success).toBe(false);
  });
});

describe("wedding details update schema", () => {
  it("accepts the editable wedding detail fields", () => {
    expect(updateWeddingSchema.safeParse({
      title: "Ananya and Vikram’s Celebration",
      description: "A joyful family celebration.",
      partnerOneName: "Ananya Sen",
      partnerTwoName: "Vikram Rao",
      city: "Jaipur",
      weddingDate: "2027-02-14",
      weddingDateIsTentative: false,
    }).success).toBe(true);
  });

  it("rejects empty updates and unsupported fields", () => {
    expect(updateWeddingSchema.safeParse({}).success).toBe(false);
    expect(updateWeddingSchema.safeParse({ ownerUserId: "client-controlled" }).success).toBe(false);
  });
});
