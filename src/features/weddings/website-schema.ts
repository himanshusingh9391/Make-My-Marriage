import { z } from "zod";

function isHttpUrl(value: string) {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

export const websiteSettingsInput = z
  .object({
    websitePublished: z.boolean(),
    theme: z.enum(["ELEGANT_ROYAL", "MINIMAL_MODERN", "TRADITIONAL_INDIAN"]),
    livestreamUrl: z
      .string()
      .trim()
      .max(500)
      .url()
      .refine(isHttpUrl)
      .or(z.literal("")),
  })
  .strict();

export type WebsiteSettingsInput = z.infer<typeof websiteSettingsInput>;
