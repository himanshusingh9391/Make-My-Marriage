// @vitest-environment node
import mongoose from "mongoose";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

afterEach(() => {
  mongoose.deleteModel(/Guest/);
  vi.resetModules();
});

it("refreshes a cached guest model before upserting a household RSVP", async () => {
  const old = mongoose.model(
    "Guest",
    new mongoose.Schema({ fullName: String }),
  );
  const { GuestModel } = await import("@/features/guests/model");
  expect(GuestModel).not.toBe(old);
  for (const path of ["householdKey", "householdStatus", "householdCount"]) {
    expect(GuestModel.schema.path(path)).toBeDefined();
  }
  expect(GuestModel.collection.name).toBe("guests");
});
