import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/features/auth/service";
import { SESSION_COOKIE_NAME } from "@/features/auth/security";
import { getOwnerDashboard } from "@/features/dashboard/service";
import { canManageWeddingInvitations, listWeddingMembers } from "@/features/weddings/invitations-service";
import MembersManager from "./members-manager";
import styles from "./members.module.css";
import chromeStyles from "../dashboard.module.css";
import { DashboardHeader, DashboardSidebar } from "../dashboard-chrome";
import GuestInvitations from "./guest-invitations";
import { listGuestInvitations } from "@/features/guests/invitations";

export const metadata = { title: "Members | Make My Marriage", description: "Manage access to your private wedding suite." };

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ workspace?: string }> }) {
  const cookieStore = await cookies();
  const user = await getSessionUser(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!user) redirect("/sign-in");
  const { workspace } = await searchParams;
  const dashboard = await getOwnerDashboard(user._id, workspace);
  if (!dashboard) redirect("/dashboard");
  const weddingId = dashboard.wedding.id;
  const [roster, canManage] = await Promise.all([
    listWeddingMembers(user._id, weddingId),
    canManageWeddingInvitations(user._id, weddingId),
  ]);
  const guestInvitations = canManage ? await listGuestInvitations(user._id, weddingId) : null;

  return <main className={chromeStyles.dashboardPage}>
    <DashboardSidebar fullName={user.fullName} workspaceId={weddingId} active="members" accountRole={dashboard.accountRole} team={dashboard.team} />
    <section className={chromeStyles.mainPanel}>
      <DashboardHeader title="Members" />
      <div className={chromeStyles.content}>
        <p className={styles.eyebrow}>SETTINGS &amp; TEAM</p>
        <h1 className={styles.pageTitle}>Members &amp; collaborators</h1>
        <p className={styles.intro}>Invite trusted family and planners into {roster.wedding.title}. Only people you invite can access this private wedding space.</p>
        <MembersManager weddingId={weddingId} initialData={roster} canManage={canManage} currentUserId={user._id.toString()} isOwner={dashboard.accountRole === "Owner"} />
        {guestInvitations && <GuestInvitations weddingId={weddingId} initialData={guestInvitations} />}
      </div>
    </section>
  </main>;
}
