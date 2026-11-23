import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import Upload from "@/app/guest-photos/[token]/upload";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => vi.unstubAllGlobals());
it("submits the guest's selected event with the photo", async () => {
  const send = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", send);
  render(
    <Upload token="example" events={[{ id: "ceremony", name: "Ceremony" }]} />,
  );
  fireEvent.change(screen.getByRole("combobox"), {
    target: { value: "ceremony" },
  });
  fireEvent.submit(
    screen.getByRole("button", { name: "Upload photo" }).closest("form")!,
  );
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("Photo added."),
  );
  expect(send.mock.calls[0][1].body.get("eventId")).toBe("ceremony");
});
it("offers general wedding memories when there are no events", () => {
  render(<Upload token="example" events={[]} />);
  expect(
    screen.getByRole("option", { name: "General wedding memories" }),
  ).toHaveValue("");
});
