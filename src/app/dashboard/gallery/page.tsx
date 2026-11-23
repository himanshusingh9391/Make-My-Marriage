import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/features/auth/service";
import { SESSION_COOKIE_NAME } from "@/features/auth/security";
import { getOwnerDashboard } from "@/features/dashboard/service";
import { listPhotos } from "@/features/gallery/service";
import { listEvents } from "@/features/events/service";
import { DashboardHeader, DashboardSidebar } from "../dashboard-chrome";
import chrome from "../dashboard.module.css";
import GalleryClient from "./gallery-client";
import styles from "./gallery.module.css";
export const metadata = { title: "Gallery | Make My Marriage" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const user = await getSessionUser(
    (await cookies()).get(SESSION_COOKIE_NAME)?.value,
  );
  if (!user) redirect("/sign-in");
  const dashboard = await getOwnerDashboard(
    user._id,
    (await searchParams).workspace,
  );
  if (!dashboard) redirect("/dashboard");
  const id = dashboard.wedding.id;
  const [photos, events] = await Promise.all([
    listPhotos(user._id, id),
    listEvents(user._id, id, 1),
  ]);
  return (
    <main className={chrome.dashboardPage}>
      <DashboardSidebar
        fullName={user.fullName}
        workspaceId={id}
        active="gallery"
        accountRole={dashboard.accountRole}
        weddingName={`${dashboard.wedding.partnerOneName} & ${dashboard.wedding.partnerTwoName}`}
      />
      <section className={chrome.mainPanel}>
        <DashboardHeader title="Gallery" />
        <div className={`${chrome.content} ${styles.content}`}>
          <GalleryClient
            canDelete={dashboard.canManageInvitations}
            weddingId={id}
            events={events.events.map((e) => ({ id: e.id, name: e.name }))}
            initial={photos.map((p) => ({
              _id: p._id.toString(),
              secureUrl: p.secureUrl,
              eventId: p.eventId?.toString() ?? null,
            }))}
          />
        </div>
      </section>
    </main>
  );
}
