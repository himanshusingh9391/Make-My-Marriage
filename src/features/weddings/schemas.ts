import { z } from "zod";

export const createWeddingSchema = z.object({
  title: z.string().trim().min(1, "Enter a title for your wedding.").max(160),
  description: z.string().trim().max(1200).default(""),
  partnerOneName: z.string().trim().min(1, "Enter the bride or partner one name.").max(120),
  partnerTwoName: z.string().trim().min(1, "Enter the groom or partner two name.").max(120),
  city: z.string().trim().min(1, "Enter a city or place.").max(120),
  weddingDate: z.string().date().optional().or(z.literal("")),
  weddingDateIsTentative: z.boolean().default(true),
});

export type CreateWeddingInput = z.infer<typeof createWeddingSchema>;

export const updateWeddingSchema = z.object({
  title: z.string().trim().min(1, "Enter a title for your wedding.").max(160).optional(),
  description: z.string().trim().max(1200).optional(),
  partnerOneName: z.string().trim().min(1, "Enter the bride or partner one name.").max(120).optional(),
  partnerTwoName: z.string().trim().min(1, "Enter the groom or partner two name.").max(120).optional(),
  city: z.string().trim().min(1, "Enter a city or place.").max(120).optional(),
  weddingDate: z.string().date().nullable().optional(),
  weddingDateIsTentative: z.boolean().optional(),
}).strict().refine((fields) => Object.keys(fields).length > 0, "Provide at least one field to update.");

export type UpdateWeddingInput = z.infer<typeof updateWeddingSchema>;
