import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/features/auth/service";
import { SESSION_COOKIE_NAME } from "@/features/auth/security";
import { getOwnerDashboard } from "@/features/dashboard/service";
import { getWebsiteSettings } from "@/features/weddings/website-service";
import { DashboardHeader, DashboardSidebar } from "../dashboard-chrome";
import chrome from "../dashboard.module.css";
import WebsiteSettingsForm from "./website-settings-form";
import styles from "./website.module.css";

export const metadata = { title: "Wedding website | Make My Marriage" };

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
  const settings = await getWebsiteSettings(user._id, dashboard.wedding.id);

  return (
    <main className={chrome.dashboardPage}>
      <DashboardSidebar
        fullName={user.fullName}
        workspaceId={dashboard.wedding.id}
        active="wedding-website"
        accountRole={dashboard.accountRole}
        weddingName={`${dashboard.wedding.partnerOneName} & ${dashboard.wedding.partnerTwoName}`}
      />
      <section className={chrome.mainPanel}>
        <DashboardHeader title="Wedding website" />
        <div className={`${chrome.content} ${styles.content}`}>
          <p className={styles.eyebrow}>A CELEBRATION TO SHARE</p>
          <h1>Your wedding website</h1>
          <p>
            Publish the details you want guests to see and share one public
            link.
          </p>
          <WebsiteSettingsForm
            weddingId={dashboard.wedding.id}
            initial={settings}
          />
        </div>
      </section>
    </main>
  );
}
