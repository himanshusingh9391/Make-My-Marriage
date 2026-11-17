import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

const mocks = vi.hoisted(() => ({ wedding: vi.fn(), membership: vi.fn(), exists: vi.fn(), send: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db/mongoose", () => ({ connectToDatabase: vi.fn() }));
vi.mock("@/lib/env/env", () => ({ environment: {}, requireResendConfig: vi.fn() }));
vi.mock("resend", () => ({ Resend: class { emails = { send: mocks.send }; } }));
vi.mock("@/features/auth/models/wedding", () => ({ Wedding: { findOne: mocks.wedding } }));
vi.mock("@/features/weddings/models/wedding-membership", () => ({ WeddingMembership: { findOne: mocks.membership, exists: mocks.exists } }));

import { authorizeWeddingMemberAdmin, canManageWeddingInvitations } from "@/features/weddings/invitations-service";

describe("wedding invitation permissions", () => {
  const owner = new Types.ObjectId();
  const actor = new Types.ObjectId();
  const weddingId = new Types.ObjectId();
  beforeEach(() => {
    vi.clearAllMocks();
    const wedding = { _id: weddingId, ownerUserId: owner };
    mocks.wedding.mockReturnValue({ lean: async () => wedding, select: () => ({ lean: async () => wedding }) });
  });
  it.each(["ADMIN", "MANAGER"])("allows %s to manage invitations in their own wedding", async role => {
    mocks.membership.mockReturnValue({ lean: async () => ({ weddingId, userId: actor, role }) });
    mocks.exists.mockResolvedValue({ _id: actor });
    await expect(authorizeWeddingMemberAdmin(actor, weddingId.toString())).resolves.toMatchObject({ actorRole: role });
    expect(await canManageWeddingInvitations(actor, weddingId.toString())).toBe(true);
    expect(mocks.exists).toHaveBeenCalledWith({ weddingId, userId: actor, role: { $in: ["ADMIN", "MANAGER"] } });
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it("rejects people without membership", async () => {
    mocks.membership.mockReturnValue({ lean: async () => null });
    mocks.exists.mockResolvedValue(null);
    await expect(authorizeWeddingMemberAdmin(actor, weddingId.toString())).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await canManageWeddingInvitations(actor, weddingId.toString())).toBe(false);
  });
  it("allows the owner without a duplicate membership", async () => {
    await expect(authorizeWeddingMemberAdmin(owner, weddingId.toString())).resolves.toMatchObject({ actorRole: "OWNER" });
    expect(mocks.membership).not.toHaveBeenCalled();
  });
});
