import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const emailVerificationTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "email_verification_tokens" },
);

emailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type EmailVerificationTokenDocument = InferSchemaType<
  typeof emailVerificationTokenSchema
> & { _id: mongoose.Types.ObjectId };

export const EmailVerificationToken =
  (mongoose.models.EmailVerificationToken as
    | Model<EmailVerificationTokenDocument>
    | undefined) ?? mongoose.model<EmailVerificationTokenDocument>(
    "EmailVerificationToken",
    emailVerificationTokenSchema,
  );
