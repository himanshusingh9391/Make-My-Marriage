import { describe, expect, it } from "vitest";
import {
  householdUpdate,
  sharedRegistration,
  sharedSettings,
} from "@/features/rsvp/shared-schemas";
describe("shared wedding invitation", () => {
  it("requires distinct events and a positive party limit", () => {
    const id = "a".repeat(24);
    expect(
      sharedSettings.safeParse({ eventIds: [id], maxPartySize: 4 }).success,
    ).toBe(true);
    for (const input of [
      { eventIds: [], maxPartySize: 1 },
      { eventIds: [id, id], maxPartySize: 1 },
      { eventIds: [id], maxPartySize: 0 },
    ]) {
      expect(sharedSettings.safeParse(input).success).toBe(false);
    }
  });
  it("accepts a named household and rejects attempts to choose another guest", () => {
    const registration = {
      name: "  Singh family  ",
      visitorKey: "730c82f7-a079-4664-9d81-7aab68f21756",
    };
    expect(sharedRegistration.parse(registration).name).toBe("Singh family");
    expect(
      sharedRegistration.safeParse({ ...registration, guestId: "another" })
        .success,
    ).toBe(false);
  });
  it("accepts an optional mobile number and rejects invalid text", () => {
    const registration = {
      name: "Singh family",
      phone: "+91 98765 43210",
      visitorKey: "730c82f7-a079-4664-9d81-7aab68f21756",
    };
    expect(sharedRegistration.parse(registration).phone).toBe(
      "+91 98765 43210",
    );
    expect(
      sharedRegistration.safeParse({ ...registration, phone: "invalid phone" })
        .success,
    ).toBe(false);
  });
});

describe("guest-entered household attendance", () => {
  it("requires a headcount only when attending", async () => {
    const { householdResponse } =
      await import("@/features/rsvp/shared-schemas");
    const guest = {
      name: "Singh family",
      visitorKey: "730c82f7-a079-4664-9d81-7aab68f21756",
    };
    for (const [status, attendeeCount, valid] of [
      ["YES", 4, true],
      ["NO", 0, true],
      ["YES", 0, false],
      ["NO", 4, false],
    ]) {
      expect(
        householdResponse.safeParse({ ...guest, status, attendeeCount })
          .success,
      ).toBe(valid);
    }
  });

  it("validates private-link response updates without requiring a browser key", () => {
    expect(
      householdUpdate.safeParse({
        name: "Singh family",
        phone: "+91 98765 43210",
        status: "YES",
        attendeeCount: 2,
      }).success,
    ).toBe(true);
    expect(
      householdUpdate.safeParse({
        name: "Singh family",
        status: "NO",
        attendeeCount: 1,
      }).success,
    ).toBe(false);
  });
});
