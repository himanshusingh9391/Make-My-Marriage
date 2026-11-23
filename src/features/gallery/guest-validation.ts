import { z } from "zod";
export const albumInput = z.object({
  eventId: z
    .string()
    .regex(/^[a-f\d]{24}$/i)
    .nullable(),
});
export const albumToken = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export function validImageHeader(
  name: string,
  mime: string,
  bytes: Uint8Array,
) {
  const starts = (...prefix: number[]) =>
    prefix.every((b, i) => bytes[i] === b);
  if (mime === "image/jpeg")
    return /\.jpe?g$/i.test(name) && starts(255, 216, 255);
  if (mime === "image/png")
    return /\.png$/i.test(name) && starts(137, 80, 78, 71, 13, 10, 26, 10);
  return (
    mime === "image/webp" &&
    /\.webp$/i.test(name) &&
    starts(82, 73, 70, 70) &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  );
}
export function downloadUrl(url: string) {
  return url.replace("/image/upload/", "/image/upload/fl_attachment/");
}
