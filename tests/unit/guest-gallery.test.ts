import { describe, it, expect } from "vitest";
import {
  albumInput,
  albumToken,
  validImageHeader,
  downloadUrl,
} from "../../src/features/gallery/guest-validation";
describe("Guest gallery", () => {
  it("accepts general albums and rejects malformed event IDs", () => {
    expect(albumInput.safeParse({ eventId: null }).success).toBe(true);
    expect(albumInput.safeParse({ eventId: "other" }).success).toBe(false);
  });
  it("requires a full token", () =>
    expect(albumToken.safeParse("guess").success).toBe(false));
  it("checks file extension, MIME and signature", () => {
    const header = Uint8Array.of(255, 216, 255);
    expect(validImageHeader("photo.jpg", "image/jpeg", header)).toBe(true);
    expect(validImageHeader("photo.png", "image/jpeg", header)).toBe(false);
    expect(validImageHeader("photo.jpg", "image/jpeg", new Uint8Array())).toBe(
      false,
    );
  });
  it("downloads with attachment disposition", () =>
    expect(
      downloadUrl("https://res.cloudinary.com/cloud/image/upload/v1/a.jpg"),
    ).toContain("/upload/fl_attachment/v1/"));
});
