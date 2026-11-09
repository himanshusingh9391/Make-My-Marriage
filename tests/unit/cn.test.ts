import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils/cn";

describe("cn", () => {
  it("joins class names and resolves conflicting Tailwind utilities", () => {
    expect(cn("px-2 text-sm", "px-4", false && "hidden")).toBe("text-sm px-4");
  });
});
