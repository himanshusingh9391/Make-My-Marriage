import SiteLogo from "../../../site-logo";
import InvitationHero from "../../invitation-hero";
import {
  sharedInvitation,
  invitationSchedule,
} from "@/features/rsvp/shared-links";
import { AppError } from "@/lib/http/app-error";
import Join from "./join";
import styles from "../../[token]/invitation.module.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Your wedding invitation",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let data;
  try {
    data = await sharedInvitation(token);
  } catch (error) {
    if (!(error instanceof AppError) || error.statusCode !== 410) throw error;
  }
  const events = data
    ? await invitationSchedule(data.wedding._id, data.link.eventIds)
    : [];
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <SiteLogo />
      </header>
      <main className={styles.content}>
        {data ? (
          <>
            <InvitationHero
              data={{
                partnerOneName: data.wedding.partnerOneName,
                partnerTwoName: data.wedding.partnerTwoName,
                weddingName: data.wedding.weddingName,
                weddingDate: data.wedding.weddingDate?.toISOString() ?? null,
                timezone: data.wedding.timezone,
              }}
            />
            <Join token={token}>
              {events.length > 0 && (
                <section className={styles.itinerary}>
                  <div className={styles.sectionHeading}>
                    <h2>Celebration Itinerary</h2>
                    <p>All times in {data.wedding.timezone}</p>
                  </div>
                  {events.map((event) => (
                    <article key={String(event._id)} className={styles.event}>
                      <div className={styles.eventBody}>
                        <h3>{event.name}</h3>
                        <p>
                          {event.startDate.toLocaleString("en-IN", {
                            dateStyle: "long",
                            timeStyle: "short",
                            timeZone: data.wedding.timezone,
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
            </Join>
          </>
        ) : (
          <h1>This invitation is unavailable</h1>
        )}
      </main>
      <footer className={styles.footer}>
        <SiteLogo />
      </footer>
    </div>
  );
}
