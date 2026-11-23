import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/features/auth/service";
import { SESSION_COOKIE_NAME } from "@/features/auth/security";
import { getOwnerDashboard } from "@/features/dashboard/service";

import { DashboardHeader, DashboardSidebar } from "../dashboard-chrome";
import chrome from "../dashboard.module.css";
import GuestQR from "./qr";
import styles from "../gallery/gallery.module.css";
export const metadata = { title: "Guest QR | Make My Marriage" };
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
  return (
    <main className={chrome.dashboardPage}>
      <DashboardSidebar
        fullName={user.fullName}
        workspaceId={id}
        active="guest-qr"
        accountRole={dashboard.accountRole}
        weddingName={`${dashboard.wedding.partnerOneName} & ${dashboard.wedding.partnerTwoName}`}
      />
      <section className={chrome.mainPanel}>
        <DashboardHeader title="Guest QR" />
        <div className={`${chrome.content} ${styles.content}`}>
          <GuestQR id={id} />
        </div>
      </section>
    </main>
  );
}
