import { z } from "zod";

export const publicPhotoUploadInput = z.object({
  eventKey: z.string().trim().max(128).nullable(),
});
