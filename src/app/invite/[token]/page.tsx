import type { Metadata } from "next";
import { getPersonalInvitation } from "@/features/rsvp/service";
import { invitationTokenSchema } from "@/features/rsvp/schemas";
import { guardRsvpPage } from "@/features/rsvp/request";
import { AppError } from "@/lib/http/app-error";
import SiteLogo from "../../site-logo";
import Invitation from "./invitation";
import styles from "./invitation.module.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your personal invitation | Make My Marriage",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let invitation;
  let message = "";
  try {
    if (!invitationTokenSchema.safeParse(token).success)
      throw new AppError(
        "This invitation is invalid or unavailable. Ask the wedding team for a new link.",
        "INVITATION_UNAVAILABLE",
        410,
      );
    await guardRsvpPage(token);
    invitation = await getPersonalInvitation(token);
  } catch (error) {
    if (error instanceof AppError) message = error.message;
    else throw error;
  }
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <SiteLogo />
      </header>
      {invitation ? (
        <Invitation initial={invitation} token={token} />
      ) : (
        <main className={styles.unavailable}>
          <p className={styles.eyebrow}>PERSONAL INVITATION</p>
          <h1>This invitation is unavailable</h1>
          <p>{message}</p>
          <p>
            You don’t need to create an account. Please contact the wedding team
            for help.
          </p>
        </main>
      )}
      <footer className={styles.footer}>
        <SiteLogo />
        <p>A shared space for your celebration.</p>
        <small>Your response is shared privately with the wedding team.</small>
      </footer>
    </div>
  );
}
