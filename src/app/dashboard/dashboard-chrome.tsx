import Link from "next/link";
import {
  CalendarDays,
  CheckSquare,
  Flower2,
  LayoutDashboard,
  Settings2,
  UsersRound,
} from "lucide-react";
import SignOutButton from "./sign-out-button";
import SiteLogo from "../site-logo";
import styles from "./dashboard.module.css";

type Props = {
  fullName: string;
  workspaceId: string;
  active: "overview" | "members";
  accountRole: string;
  team?: { id: string; fullName: string; role: string }[];
};

const plannedItems = [
  { label: "Checklist", icon: CheckSquare },
  { label: "Style & notes", icon: Flower2 },
  { label: "Settings", icon: Settings2 },
];

export function DashboardSidebar({ fullName, workspaceId, active, accountRole, team = [] }: Props) {
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <aside className={styles.sidebar}>
      <SiteLogo />
      <div className={styles.workspaceLabel}>YOUR WEDDING SUITE</div>
      <nav className={styles.navigation} aria-label="Wedding suite navigation">
        <Link
          className={`${styles.navItem} ${active === "overview" ? styles.navItemActive : ""} ${styles.navItemLink}`}
          href={`/dashboard?workspace=${workspaceId}`}
          aria-current={active === "overview" ? "page" : undefined}
        ><LayoutDashboard size={18} strokeWidth={1.8} aria-hidden="true" />Overview</Link>
        {workspaceId ? <>
          <Link className={`${styles.navItem} ${styles.navItemLink}`} href={`/dashboard?workspace=${workspaceId}#wedding-title`}>
            <CalendarDays size={18} strokeWidth={1.8} aria-hidden="true" />Wedding details
          </Link>
          <Link
            className={`${styles.navItem} ${active === "members" ? styles.navItemActive : ""} ${styles.navItemLink}`}
            href={`/dashboard/members?workspace=${workspaceId}`}
            aria-current={active === "members" ? "page" : undefined}
          ><UsersRound size={18} strokeWidth={1.8} aria-hidden="true" />Members</Link>
        </> : <span className={styles.navItem} aria-disabled="true"><UsersRound size={18} strokeWidth={1.8} aria-hidden="true" />Members<span className={styles.comingSoon}>Set up first</span></span>}
        {plannedItems.map(({ label, icon: Icon }) => (
          <span className={styles.navItem} key={label} aria-disabled="true" title={`${label} planning is coming soon`}>
            <Icon size={18} strokeWidth={1.8} aria-hidden="true" />{label}<span className={styles.comingSoon}>Soon</span>
          </span>
        ))}
      </nav>
      <div className={styles.sidebarBottom}>
        {team.length > 0 && <div aria-label="Wedding team">
          <div className={styles.workspaceLabel}>WEDDING TEAM</div>
          {team.map((member) => <div className={styles.sidebarAccount} key={member.id}>
            <span className={styles.accountText}><strong>{member.fullName}</strong><small>{member.role}</small></span>
          </div>)}
        </div>}
        <div className={styles.sidebarRule} />
        <div className={styles.sidebarAccount}>
          <span className={styles.avatar}>{initials}</span>
          <span className={styles.accountText}><strong>{fullName}</strong><small>{accountRole}</small></span>
        </div>
      </div>
    </aside>
  );
}

export function DashboardHeader({ title }: { title: string }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.breadcrumb}>Wedding suite <span aria-hidden="true">/</span> <span>{title}</span></div>
      <div className={styles.topbarActions}>
        <span className={styles.ownerGreeting}>A little progress, every day.</span>
        <SignOutButton />
      </div>
    </header>
  );
}
