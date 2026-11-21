import { test, expect, type Page } from "@playwright/test";
import nextEnv from "@next/env";
import { MongoClient, ObjectId } from "mongodb";
import { createHmac, randomBytes } from "node:crypto";

nextEnv.loadEnvConfig(process.cwd());

test("public and account pages fit mobile, tablet and desktop", async ({
  page,
}) => {
  test.setTimeout(180_000);
  for (const route of [
    "/",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
    "/resend-verification",
    "/verify-email",
    "/invitations/accept",
    "/guest-invitation",
  ]) {
    await page.goto(route);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `${route} fits ${width}px`,
      ).toBeTruthy();
    }
  }
});

// Opt in explicitly: this suite writes and then removes only its own QA records.
// Invitations are seeded as sent; no real email is sent by this suite.
test("account, wedding, members, guests, permissions and responsive layouts", async ({
  page,
  browser,
}) => {
  test.skip(
    process.env.RUN_DB_E2E !== "1",
    "Requires explicit permission to create temporary database records",
  );
  test.setTimeout(300_000);
  const suffix = randomBytes(8).toString("hex");
  const ownerEmail = `qa-owner-${suffix}@example.com`;
  const memberEmail = `qa-member-${suffix}@example.com`;
  const password = `QA-${suffix}-Strong!9`;
  const client = new MongoClient(process.env.MONGODB_URI!, {
    serverSelectionTimeoutMS: 10_000,
  });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB_NAME || "mmm-db");
  const memberContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const memberPage = await memberContext.newPage();
  const guestPage = await guestContext.newPage();
  const base = "http://localhost:3000";
  const hash = (token: string) =>
    createHmac("sha256", process.env.TOKEN_HASH_SECRET!)
      .update(token)
      .digest("hex");
  async function login(target: Page, email: string) {
    await target.goto(`${base}/sign-in`);
    await target.getByLabel("Member email").fill(email);
    await target.getByLabel("Vault password", { exact: true }).fill(password);
    await target.getByRole("button", { name: "Access wedding suite" }).click();
    await expect(target).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  }
  try {
    await page.goto("/sign-up");
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(page.locator("input:invalid").first()).toBeVisible();
    await page
      .getByLabel("Full name", { exact: true })
      .fill("QA Wedding Owner");
    await page.getByLabel("Email", { exact: true }).fill(ownerEmail);
    await page.getByLabel("Create vault password").fill(password);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(page).toHaveURL(/sign-in\?registered/, { timeout: 30_000 });
    await page.getByLabel("Member email").fill(ownerEmail);
    await page
      .getByLabel("Vault password", { exact: true })
      .fill("Incorrect-password!9");
    await page.getByRole("button", { name: "Access wedding suite" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: /invalid|incorrect/i }),
    ).toBeVisible();
    await login(page, ownerEmail);
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `setup fits ${width}px`,
      ).toBeTruthy();
    }
    await page.getByLabel("Wedding title").fill(`QA Celebration ${suffix}`);
    await page.getByLabel("Bride / Partner one full name").fill("QA Bride");
    await page.getByLabel("Groom / Partner two full name").fill("QA Groom");
    await page
      .getByLabel("Description", { exact: true })
      .fill("Temporary end-to-end verification");
    await page.getByLabel("City or place").fill("Jaipur");
    await page
      .getByLabel("Tentative wedding date", { exact: true })
      .fill("2027-12-20");
    await page.getByRole("button", { name: "Save wedding details" }).click();
    await expect(
      page.getByRole("heading", { name: "QA Bride & QA Groom" }),
    ).toBeVisible({ timeout: 30_000 });
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
        `overview fits ${width}px`,
      ).toBeTruthy();
      await page.screenshot({
        path: `test-results/dashboard-${width}.png`,
        fullPage: true,
      });
    }
    const owner = await db
      .collection("users")
      .findOne({ normalizedEmail: ownerEmail });
    expect(owner).toBeTruthy();
    const wedding = await db
      .collection("weddings")
      .findOne({ ownerUserId: owner!._id });
    expect(wedding).toBeTruthy();
    const weddingId = wedding!._id.toString();
    const memberEndpoint = `/api/v1/weddings/${weddingId}/members`;
    expect(
      (
        await page.request.post("/api/v1/auth/register", {
          data: { fullName: "QA Member", email: memberEmail, password },
        })
      ).status(),
    ).toBe(201);
    await login(memberPage, memberEmail);
    expect(
      (await memberPage.request.get(`${base}${memberEndpoint}`)).status(),
    ).toBe(403);
    const token = randomBytes(32).toString("base64url");
    const invitation = await db.collection("wedding_invitations").insertOne({
      weddingId: wedding!._id,
      invitedByUserId: owner!._id,
      email: memberEmail,
      normalizedEmail: memberEmail,
      role: "MANAGER",
      tokenHash: hash(token),
      activeInvitationKey: `${weddingId}:${memberEmail}`,
      expiresAt: new Date(Date.now() + 86_400_000),
      acceptedAt: null,
      revokedAt: null,
      deliveryStatus: "SENT",
      sentAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(
      (
        await page.request.post("/api/v1/invitations/accept", {
          data: { token },
        })
      ).status(),
    ).toBe(403);
    await memberPage.goto(`${base}/invitations/accept?token=${token}`);
    await memberPage.getByRole("button", { name: "Accept invitation" }).click();
    await expect(memberPage).toHaveURL(
      new RegExp(`/dashboard\\?workspace=${weddingId}`),
      { timeout: 30_000 },
    );
    const member = await db
      .collection("users")
      .findOne({ normalizedEmail: memberEmail });
    expect(
      await db.collection("wedding_memberships").findOne({
        weddingId: wedding!._id,
        userId: member!._id,
        role: "MANAGER",
      }),
    ).toBeTruthy();
    expect(
      (
        await memberPage.request.post(`${base}/api/v1/invitations/accept`, {
          data: { token },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await memberPage.request.get(
          `${base}/api/v1/weddings/${weddingId}/guest-invitations`,
        )
      ).status(),
    ).toBe(200);
    await memberPage.goto(`${base}/dashboard/members?workspace=${weddingId}`);
    await expect(
      memberPage.getByRole("button", {
        name: "Send member invitation",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      memberPage.getByRole("button", { name: "Send Invitation", exact: true }),
    ).toBeVisible();
    await page.goto(`/dashboard/members?workspace=${weddingId}`);
    await expect(
      page.getByRole("heading", { name: "Wedding members", exact: true }),
    ).toBeVisible();
    await expect(page.getByLabel("Access level")).toHaveValue("MANAGER");
    await expect(
      page.getByRole("link", { name: "Send Invitation", exact: true }),
    ).toBeVisible();
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBeTruthy();
      await expect(
        page.getByRole("button", { name: "Invite Member", exact: true }),
      ).toBeVisible();
      expect(
        await page
          .locator("main > section")
          .evaluate((element) => element.scrollWidth <= element.clientWidth),
      ).toBeTruthy();
      if (width <= 900) {
        await page.getByRole("button", { name: "Open navigation" }).click();
        await expect(
          page.getByRole("link", { name: "Wedding members", exact: true }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Close navigation" }).click();
      } else {
        const sidebar = page.locator("main > aside");
        const before = await sidebar.boundingBox();
        await page.locator("main > section").evaluate((element) => {
          element.scrollTop = 400;
        });
        expect(await sidebar.boundingBox()).toEqual(before);
        expect(
          await sidebar.evaluate(
            (element) => element.scrollHeight <= element.clientHeight,
          ),
        ).toBeTruthy();
        await page.locator("main > section").evaluate((element) => {
          element.scrollTop = 0;
        });
      }
      await page.screenshot({
        path: `test-results/members-${width}.png`,
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page
      .getByRole("button", { name: "Recovery Error", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Try again", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Wedding members", exact: true }),
    ).toBeVisible();
    const guestToken = randomBytes(32).toString("base64url");
    const guest = await db.collection("guests").insertOne({
      weddingId: wedding!._id,
      fullName: "QA Relative",
      email: `qa-relative-${suffix}@example.com`,
      normalizedEmail: `qa-relative-${suffix}@example.com`,
      invitationTokenHash: hash(guestToken),
      invitationStatus: "PENDING",
      invitationSentAt: new Date(),
      invitationExpiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await guestPage.goto(`${base}/guest-invitation?token=${guestToken}`);
    await guestPage.getByRole("button", { name: "Accept invitation" }).click();
    await expect(
      guestPage.getByRole("heading", { name: "Invitation accepted" }),
    ).toBeVisible();
    expect(
      (await db.collection("guests").findOne({ _id: guest.insertedId }))
        ?.invitationStatus,
    ).toBe("ACCEPTED");
    await guestPage.goto(`${base}/dashboard`);
    await expect(guestPage).toHaveURL(/sign-in/);
    const revokedToken = randomBytes(32).toString("base64url");
    const revoked = await db.collection("wedding_invitations").insertOne({
      weddingId: wedding!._id,
      invitedByUserId: owner!._id,
      email: memberEmail,
      normalizedEmail: memberEmail,
      role: "ADMIN",
      tokenHash: hash(revokedToken),
      expiresAt: new Date(Date.now() + 86_400_000),
      acceptedAt: null,
      revokedAt: null,
      deliveryStatus: "SENT",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(
      (
        await memberPage.request.delete(
          `${base}/api/v1/weddings/${weddingId}/invitations/${revoked.insertedId}`,
        )
      ).status(),
    ).toBe(200);
    expect(
      (
        await memberPage.request.post(`${base}/api/v1/invitations/accept`, {
          data: { token: revokedToken },
        })
      ).status(),
    ).toBe(410);
    const expiredToken = randomBytes(32).toString("base64url");
    await db.collection("wedding_invitations").insertOne({
      weddingId: wedding!._id,
      invitedByUserId: owner!._id,
      email: memberEmail,
      normalizedEmail: memberEmail,
      role: "MANAGER",
      tokenHash: hash(expiredToken),
      expiresAt: new Date(Date.now() - 1000),
      acceptedAt: null,
      revokedAt: null,
      deliveryStatus: "SENT",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(
      (
        await memberPage.request.post(`${base}/api/v1/invitations/accept`, {
          data: { token: expiredToken },
        })
      ).status(),
    ).toBe(410);
    const guestRevokeToken = randomBytes(32).toString("base64url");
    const guestRevoke = await db.collection("guests").insertOne({
      weddingId: wedding!._id,
      fullName: "QA Revoked Relative",
      normalizedEmail: `qa-revoked-${suffix}@example.com`,
      email: `qa-revoked-${suffix}@example.com`,
      invitationTokenHash: hash(guestRevokeToken),
      invitationStatus: "PENDING",
      invitationSentAt: new Date(),
      invitationExpiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(
      (
        await memberPage.request.delete(
          `${base}/api/v1/weddings/${weddingId}/guest-invitations?guestId=${guestRevoke.insertedId}`,
        )
      ).status(),
    ).toBe(200);
    expect(
      (
        await guestPage.request.post(
          `${base}/api/v1/guest-invitations/accept`,
          { data: { token: guestRevokeToken } },
        )
      ).status(),
    ).toBe(410);
    expect(
      (
        await page.request.delete(
          `/api/v1/weddings/${weddingId}/members/${owner!._id}`,
        )
      ).status(),
    ).toBe(403);
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Member removed" }),
    ).toBeVisible();
    expect(
      (await memberPage.request.get(`${base}${memberEndpoint}`)).status(),
    ).toBe(403);
    expect(
      (
        await db
          .collection("wedding_invitations")
          .findOne({ _id: invitation.insertedId })
      )?.acceptedAt,
    ).toBeTruthy();
    const oldCookie = (await page.context().cookies()).find(
      (cookie) => cookie.name === "mmm_session",
    )!;
    await page.getByRole("button", { name: "Log out", exact: true }).click();
    await expect(page).toHaveURL(/sign-in/);
    expect(
      (await page.context().cookies()).find(
        (cookie) => cookie.name === "mmm_session",
      ),
    ).toBeUndefined();
    expect(
      await db.collection("user_sessions").findOne({
        sessionTokenHash: createHmac("sha256", process.env.SESSION_SECRET!)
          .update(oldCookie.value)
          .digest("hex"),
        revokedAt: { $ne: null },
      }),
    ).toBeTruthy();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/sign-in/);
  } finally {
    await memberContext.close();
    await guestContext.close();
    const users = await db
      .collection("users")
      .find({ normalizedEmail: { $in: [ownerEmail, memberEmail] } })
      .toArray();
    const userIds = users.map((user) => user._id);
    const weddings = await db
      .collection("weddings")
      .find({ ownerUserId: { $in: userIds } })
      .toArray();
    const weddingIds: ObjectId[] = weddings.map((wedding) => wedding._id);
    for (const collection of [
      "wedding_settings",
      "wedding_invitations",
      "wedding_memberships",
      "guests",
    ]) {
      await db
        .collection(collection)
        .deleteMany({ weddingId: { $in: weddingIds } });
    }
    for (const collection of [
      "user_sessions",
      "email_verification_tokens",
      "password_reset_tokens",
    ]) {
      await db.collection(collection).deleteMany({ userId: { $in: userIds } });
    }
    await db.collection("weddings").deleteMany({ _id: { $in: weddingIds } });
    await db.collection("users").deleteMany({ _id: { $in: userIds } });
    await client.close();
  }
});
