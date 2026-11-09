import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { withErrorHandling } from "@/lib/http/with-error-handling";

describe("withErrorHandling", () => {
  it("forwards route context to the wrapped handler", async () => {
    const context = { params: Promise.resolve({ weddingId: "wedding-1" }) };
    const handler = vi.fn(async (_request, receivedContext) =>
      NextResponse.json(await receivedContext.params),
    );
    const route = withErrorHandling(handler);

    const response = await route(
      new NextRequest("http://localhost/api/v1/weddings/wedding-1"),
      context,
    );

    expect(handler).toHaveBeenCalledWith(expect.any(NextRequest), context);
    expect(await response.json()).toEqual({ weddingId: "wedding-1" });
  });

  it("returns a 400 validation response for Zod errors", async () => {
    const route = withErrorHandling(async () => {
      const { z } = await import("zod");
      z.string().parse(42);
      return NextResponse.json({ success: true });
    });

    const response = await route(new NextRequest("http://localhost/api/v1/test"), {
      params: Promise.resolve({}),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request data",
      },
    });
  });
});
