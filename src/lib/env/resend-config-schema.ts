import { z } from "zod";

const emailAddressSchema = z.string().email();

const fromEmailSchema = z.string().trim().min(1).refine((value) => {
  if (/[\r\n]/.test(value)) return false;
  const displayAddress = value.match(/^.+\s<([^<>]+)>$/);
  const address = displayAddress?.[1]?.trim() ?? value;
  return emailAddressSchema.safeParse(address).success;
}, "RESEND_FROM_EMAIL must be an email address, optionally with a display name");

export const resendConfigSchema = z.object({
  apiKey: z.string().trim().min(1, "RESEND_API_KEY is required to send email"),
  fromEmail: fromEmailSchema,
});

export function isResendTestingSender(fromEmail: string): boolean {
  const displayAddress = fromEmail.match(/^.+\s<([^<>]+)>$/);
  const address = (displayAddress?.[1] ?? fromEmail).trim();
  return address.toLowerCase().endsWith("@resend.dev");
}
