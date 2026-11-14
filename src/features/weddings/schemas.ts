import { z } from "zod";

export const createWeddingSchema = z.object({
  partnerOneName: z.string().trim().min(1, "Enter the bride or partner one name.").max(120),
  partnerTwoName: z.string().trim().min(1, "Enter the groom or partner two name.").max(120),
  city: z.string().trim().min(1, "Enter a city or place.").max(120),
  weddingDate: z.string().date().optional().or(z.literal("")),
  weddingDateIsTentative: z.boolean().default(true),
});

export type CreateWeddingInput = z.infer<typeof createWeddingSchema>;
