import Link from "next/link";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getSessionUser } from "@/features/auth/service";
import { SESSION_COOKIE_NAME } from "@/features/auth/security";
import { getOwnerDashboard } from "@/features/dashboard/service";
import { listEvents, getEvent } from "@/features/events/service";
import { eventPageSchema, objectIdSchema } from "@/features/events/schemas";
import { AppError } from "@/lib/http/app-error";
import { DashboardHeader, DashboardSidebar } from "../dashboard-chrome";
import chrome from "../dashboard.module.css";
import styles from "./events.module.css";
import EventForm from "./event-form";
import EventList from "./event-list";

export const metadata = { title: "Events | Make My Marriage" };
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{
    workspace?: string;
    mode?: string;
    event?: string;
    page?: string;
  }>;
}) {
  const user = await getSessionUser(
    (await cookies()).get(SESSION_COOKIE_NAME)?.value,
  );
  if (!user) redirect("/sign-in");
  const query = await searchParams;
  const dashboard = await getOwnerDashboard(user._id, query.workspace);
  if (!dashboard) redirect("/dashboard");
  const weddingId = dashboard.wedding.id;
  const page = eventPageSchema.safeParse(query.page);
  if (
    !page.success ||
    (query.event && !objectIdSchema.safeParse(query.event).success)
  )
    notFound();
  const data = await listEvents(user._id, weddingId, page.data);
  let event;
  if (query.event) {
    try {
      event = await getEvent(user._id, weddingId, query.event);
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) notFound();
      throw error;
    }
  }
  const editing = query.mode === "new" || Boolean(event);
  const readOnly = dashboard.wedding.status === "ARCHIVED";
  const base = `/dashboard/events?workspace=${weddingId}`;
  return (
    <main className={chrome.dashboardPage}>
      <DashboardSidebar
        fullName={user.fullName}
        workspaceId={weddingId}
        active="events"
        accountRole={dashboard.accountRole}
        weddingName={`${dashboard.wedding.partnerOneName} & ${dashboard.wedding.partnerTwoName}`}
      />
      <section className={chrome.mainPanel}>
        <DashboardHeader title="Events" />
        <div className={`${chrome.content} ${styles.content}`}>
          {editing && (
            <Link href={base} className={styles.back}>
              ← Back to events
            </Link>
          )}
          <div className={styles.heading}>
            <div>
              <p className={styles.eyebrow}>ITINERARY MANAGEMENT</p>
              <h1>
                {editing
                  ? event
                    ? "Edit event"
                    : "Add an event"
                  : "Your celebrations"}
              </h1>
              <p className={styles.intro}>
                {editing
                  ? "Create a place for every moment in your wedding itinerary."
                  : "Every moment, with a place in your plans. Organise your wedding events together."}
              </p>
            </div>
            {!editing && !readOnly && (
              <Link className={styles.primary} href={`${base}&mode=new`}>
                + Add an event
              </Link>
            )}
          </div>
          {readOnly && (
            <p className={styles.notice}>
              This wedding is archived. Events are available to view only.
            </p>
          )}
          {editing ? (
            <EventForm
              weddingId={weddingId}
              timezone={data.timezone}
              event={event}
              readOnly={readOnly}
            />
          ) : (
            <>
              <div className={styles.summary}>
                <span>
                  <strong>{data.pagination.total}</strong> wedding events
                </span>
                <span>All times in {data.timezone}</span>
              </div>
              <EventList
                events={data.events}
                weddingId={weddingId}
                readOnly={readOnly}
              />
              <nav className={styles.pagination} aria-label="Event pages">
                {page.data > 1 && (
                  <Link
                    className={styles.secondary}
                    href={`${base}&page=${page.data - 1}`}
                  >
                    Previous
                  </Link>
                )}
                <span>Page {page.data}</span>
                {data.pagination.hasMore && (
                  <Link
                    className={styles.secondary}
                    href={`${base}&page=${page.data + 1}`}
                  >
                    Next
                  </Link>
                )}
              </nav>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
