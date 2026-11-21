import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/features/auth/service";
import { SESSION_COOKIE_NAME } from "@/features/auth/security";
import { getOwnerDashboard } from "@/features/dashboard/service";
import { DashboardHeader, DashboardSidebar } from "../dashboard-chrome";
import chrome from "../dashboard.module.css";

export async function loadPlanningWorkspace(workspace?: string) {
  const user = await getSessionUser(
    (await cookies()).get(SESSION_COOKIE_NAME)?.value,
  );
  if (!user) redirect("/sign-in");
  const dashboard = await getOwnerDashboard(user._id, workspace);
  if (!dashboard) redirect("/dashboard");
  return { user, dashboard };
}
type Workspace = Awaited<ReturnType<typeof loadPlanningWorkspace>>;
export function PlanningWorkspace({
  context,
  children,
  title,
  active,
}: {
  context: Workspace;
  children: ReactNode;
  title: string;
  active: "tasks" | "events" | "guests" | "rsvp";
}) {
  const { user, dashboard } = context;
  return (
    <main className={chrome.dashboardPage}>
      <DashboardSidebar
        fullName={user.fullName}
        workspaceId={dashboard.wedding.id}
        active={active}
        accountRole={dashboard.accountRole}
        weddingName={`${dashboard.wedding.partnerOneName} & ${dashboard.wedding.partnerTwoName}`}
      />
      <section className={chrome.mainPanel}>
        <DashboardHeader title={title} />
        <div className={chrome.content}>{children}</div>
      </section>
    </main>
  );
}
