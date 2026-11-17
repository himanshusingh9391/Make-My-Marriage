import {
  CalendarDays,
  ClipboardList,
  Coins,
  Flower2,
  Gem,
  Heart,
  MapPin,
  UsersRound,
} from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/features/auth/service";
import { getOwnerDashboard } from "@/features/dashboard/service";
import { SESSION_COOKIE_NAME } from "@/features/auth/security";
import { DashboardHeader, DashboardSidebar } from "./dashboard-chrome";
import WeddingDetailsEditor from "./wedding-details-editor";
import WeddingSetupForm from "./wedding-setup-form";
import styles from "./dashboard.module.css";

export const metadata = {
  title: "Wedding Suite | Make My Marriage",
  description: "Your private wedding planning dashboard.",
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ workspace?: string }> }) {
  const cookieStore = await cookies();
  const user = await getSessionUser(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!user) redirect("/sign-in");

  const { workspace } = await searchParams;
  const dashboard = await getOwnerDashboard(user._id, workspace);
  if (workspace && !dashboard) redirect("/dashboard");
  const weddingDate = dashboard?.wedding.weddingDate
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "long",
        timeZone: "Asia/Kolkata",
      }).format(new Date(dashboard.wedding.weddingDate))
    : "Choose a date when you’re ready";
  const remainingDays = dashboard?.wedding.weddingDate
    ? (() => {
        const parts = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).formatToParts(new Date());
        const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
        const today = `${part("year")}-${part("month")}-${part("day")}T00:00:00Z`;
        return Math.round((new Date(`${dashboard.wedding.weddingDate.slice(0, 10)}T00:00:00Z`).getTime() - new Date(today).getTime()) / 86_400_000);
      })()
    : null;

  return (
    <main className={styles.dashboardPage}>
      <DashboardSidebar fullName={user.fullName} workspaceId={dashboard?.wedding.id ?? ""} active="overview" accountRole={dashboard?.accountRole ?? "Account"} team={dashboard?.team} />

      <section className={styles.mainPanel}>
        <DashboardHeader title="Overview" />

        <div className={styles.content}>
          <div className={styles.welcomeBlock}>
            <div>
              <p className={styles.eyebrow}><i /> YOUR PRIVATE PLANNING SPACE</p>
              <h1>Welcome, {user.fullName.split(/\s+/)[0]} <span>♡</span></h1>
              <p className={styles.welcomeCopy}>Your celebration is taking shape. Let’s make every detail feel like yours.</p>
            </div>
            <div className={styles.dateChip}><Gem size={15} /> {dashboard ? "Thoughtfully yours" : "Your celebration starts here"}</div>
          </div>

          {dashboard ? (
            <section className={styles.weddingCard} aria-labelledby="wedding-title">
              <div className={styles.weddingCardImage} aria-hidden="true">
                <span className={styles.cardOrnament}>✳</span>
                <span className={styles.cardImageCaption}>A beautiful beginning</span>
              </div>
              <div className={styles.weddingCardBody}>
                <div className={styles.weddingCardTopline}>
                  <span className={styles.statusBadge}><i /> {dashboard.wedding.status.toLowerCase()} workspace</span>
                  <span className={styles.workspaceId}>YOUR CELEBRATION</span>
                </div>
                <h2 id="wedding-title">{dashboard.wedding.partnerOneName} <span>&amp;</span> {dashboard.wedding.partnerTwoName}</h2>
                {remainingDays !== null && <p className={styles.weddingCountdown} aria-label="Wedding countdown">
                  <strong>{remainingDays >= 0 ? remainingDays : 0}</strong>
                  <span>{remainingDays > 1 ? "days to go" : remainingDays === 1 ? "day to go" : remainingDays === 0 ? "Wedding day" : "Date has passed"}</span>
                  {dashboard.wedding.weddingDateIsTentative && <em>· tentative date</em>}
                </p>}
                <p className={styles.weddingCardDetails}>
                  <span><CalendarDays size={16} /> {weddingDate}</span>
                  <span><MapPin size={16} /> {dashboard.wedding.city}</span>
                </p>
                <p className={styles.weddingName}>{dashboard.wedding.name}</p>
                {dashboard.wedding.description && <p className={styles.weddingDescription}>{dashboard.wedding.description}</p>}
                {dashboard.canEditWedding && <WeddingDetailsEditor wedding={{
                  id: dashboard.wedding.id,
                  title: dashboard.wedding.name,
                  description: dashboard.wedding.description,
                  partnerOneName: dashboard.wedding.partnerOneName,
                  partnerTwoName: dashboard.wedding.partnerTwoName,
                  city: dashboard.wedding.city,
                  weddingDate: dashboard.wedding.weddingDate?.slice(0, 10) ?? null,
                  weddingDateIsTentative: dashboard.wedding.weddingDateIsTentative,
                }} />}
              </div>
              <div className={styles.weddingCardSeal}><Heart size={18} fill="currentColor" /></div>
            </section>
          ) : <WeddingSetupForm />}

          {dashboard && <>
          <div className={styles.sectionHeading}>
            <div><p className={styles.eyebrow}>YOUR PLANNING AT A GLANCE</p><h2>A lovely place to begin</h2></div>
            <span className={styles.liveLabel}><i /> LIVE WORKSPACE</span>
          </div>

          <div className={styles.statGrid}>
            <article className={styles.statCard}>
              <span className={`${styles.statIcon} ${styles.iconRose}`}><CalendarDays size={19} /></span>
              <p>Events planned</p><strong>{dashboard?.stats.eventCount ?? 0}</strong>
              <small>Your ceremonies, all in one place</small>
            </article>
            <article className={styles.statCard}>
              <span className={`${styles.statIcon} ${styles.iconGold}`}><UsersRound size={19} /></span>
              <p>Guests invited</p><strong>{dashboard?.stats.guestCount ?? 0}</strong>
              <small>People you’ll celebrate with</small>
            </article>
            <article className={styles.statCard}>
              <span className={`${styles.statIcon} ${styles.iconGreen}`}><ClipboardList size={19} /></span>
              <p>Tasks to cherish</p><strong>{dashboard?.stats.taskCount ?? 0}</strong>
              <small>Little steps toward your day</small>
            </article>
            <article className={styles.statCard}>
              <span className={`${styles.statIcon} ${styles.iconBlue}`}><Coins size={19} /></span>
              <p>Recorded spend</p>
              <strong>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format((dashboard?.stats.expenseTotalMinor ?? 0) / 100)}</strong>
              <small>Only expenses you’ve recorded</small>
            </article>
          </div>

          <section className={styles.nextStepCard}>
            <div className={styles.nextStepIcon}><Flower2 size={21} /></div>
            <div><p className={styles.eyebrow}>YOUR NEXT CHAPTER</p><h2>Start with the moments that matter</h2><p>Events, guest lists, and planning tools will live here as we build out your suite.</p></div>
            <span className={styles.nextStepNote}>Your space is private<br />and just getting started</span>
          </section>
          </>}

          <footer className={styles.dashboardFooter}>Made for the moments you’ll remember <Heart size={13} fill="currentColor" /></footer>
        </div>
      </section>
    </main>
  );
}
