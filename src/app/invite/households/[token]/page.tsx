import type { Metadata } from "next";
import SiteLogo from "../../../site-logo";
import InvitationHero from "../../invitation-hero";
import HouseholdRsvp from "./household-rsvp";
import { getHouseholdInvitation } from "@/features/rsvp/shared-links";
import { guardRsvpPage } from "@/features/rsvp/request";
import { AppError } from "@/lib/http/app-error";
import styles from "../../[token]/invitation.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your wedding invitation | Make My Marriage",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function HouseholdInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let invitation: Awaited<ReturnType<typeof getHouseholdInvitation>> | null =
    null;
  let message = "";
  try {
    await guardRsvpPage(token);
    invitation = await getHouseholdInvitation(token);
  } catch (error) {
    if (error instanceof AppError) message = error.message;
    else throw error;
  }
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <SiteLogo />
      </header>
      <main className={styles.content}>
        {invitation ? (
          <>
            <InvitationHero data={invitation.wedding} />
            <HouseholdRsvp initial={invitation.response} token={token} />
            {invitation.events.length > 0 && (
              <section className={styles.itinerary}>
                <div className={styles.sectionHeading}>
                  <p className={styles.eyebrow}>Your personal schedule</p>
                  <h2>Celebration Itinerary</h2>
                  <p>All times in {invitation.wedding.timezone}</p>
                </div>
                {invitation.events.map((event) => (
                  <article key={String(event._id)} className={styles.event}>
                    <div className={styles.eventBody}>
                      <h3>{event.name}</h3>
                      <p>
                        {event.startDate.toLocaleString("en-IN", {
                          dateStyle: "long",
                          timeStyle: "short",
                          timeZone: invitation.wedding.timezone,
                        })}
                      </p>
                      <p>
                        {[event.venue?.name, event.venue?.address]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      {event.dressCode && (
                        <small>Dress code · {event.dressCode}</small>
                      )}
                    </div>
                  </article>
                ))}
              </section>
            )}
          </>
        ) : (
          <section className={styles.unavailable}>
            <p className={styles.eyebrow}>PRIVATE INVITATION</p>
            <h1>This invitation is unavailable</h1>
            <p>{message}</p>
          </section>
        )}
      </main>
      <footer className={styles.footer}>
        <SiteLogo />
        <p>A shared space for your celebration.</p>
      </footer>
    </div>
  );
}
