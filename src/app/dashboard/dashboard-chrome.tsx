"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  Settings2,
  Menu,
  X,
  Coins,
  Store,
  Search,
  Globe,
  Image,
  QrCode,
  Video,
  Mail,
  UsersRound,
} from "lucide-react";
import SignOutButton from "./sign-out-button";
import SiteLogo from "../site-logo";
import styles from "./dashboard.module.css";

type Props = {
  fullName: string;
  workspaceId: string;
  active:
    | "overview"
    | "members"
    | "events"
    | "tasks"
    | "guests"
    | "rsvp"
    | "gallery"
    | "guest-qr"
    | "wedding-website";
  accountRole: string;
  weddingName?: string;
};

const groups = [
  {
    label: "Planning",
    items: [
      { label: "Events", icon: CalendarDays },
      { label: "Tasks", icon: CheckSquare },
    ],
  },
  {
    label: "Guests",
    items: [
      { label: "Guest list", icon: UsersRound },
      { label: "Invitations & RSVP", icon: Mail },
    ],
  },
  {
    label: "Finance & vendors",
    items: [
      { label: "Expenses", icon: Coins },
      { label: "My vendors", icon: Store },
      { label: "Discover vendors", icon: Search },
    ],
  },
  {
    label: "Website & media",
    items: [
      { label: "Wedding website", icon: Globe },
      { label: "Gallery", icon: Image },
      { label: "Guest QR", icon: QrCode },
      { label: "Livestream", icon: Video },
    ],
  },
];

export function DashboardSidebar({
  fullName,
  workspaceId,
  active,
  accountRole,
  weddingName,
}: Props) {
  const [open, setOpen] = useState(false);
  const overview = workspaceId
    ? `/dashboard?workspace=${workspaceId}`
    : "/dashboard";
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarBrand}>
        <SiteLogo />
        <button
          type="button"
          className={styles.menuToggle}
          aria-expanded={open}
          aria-controls="suite-navigation"
          aria-label={open ? "Close navigation" : "Open navigation"}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      <div className={styles.sidebarWorkspace}>
        <p className={styles.eyebrow}>YOUR WEDDING WORKSPACE</p>
        <strong>{weddingName || "Your celebration"}</strong>
      </div>
      <nav
        id="suite-navigation"
        className={`${styles.navigation} ${open ? styles.navigationOpen : ""}`}
        aria-label="Wedding suite navigation"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            document
              .querySelector<HTMLButtonElement>(
                `button[aria-controls="suite-navigation"]`,
              )
              ?.focus();
          }
        }}
      >
        <Link
          className={`${styles.navItem} ${styles.navItemLink} ${active === "overview" ? styles.navItemActive : ""}`}
          href={overview}
          aria-current={active === "overview" ? "page" : undefined}
          onClick={() => setOpen(false)}
        >
          <LayoutDashboard size={17} />
          Dashboard
        </Link>
        {groups.map((group) => (
          <div className={styles.navGroup} key={group.label}>
            <p className={styles.navGroupLabel}>{group.label}</p>
            {group.items.map(({ label, icon: Icon }) =>
              (label === "Events" ||
                label === "Gallery" ||
                label === "Guest QR" ||
                label === "Wedding website" ||
                label === "Tasks" ||
                label === "Guest list" ||
                label === "Invitations & RSVP") &&
              workspaceId ? (
                <Link
                  key={label}
                  className={`${styles.navItem} ${styles.navItemLink} ${active === (label === "Guest list" ? "guests" : label === "Invitations & RSVP" ? "rsvp" : label.toLowerCase().replaceAll(" ", "-")) ? styles.navItemActive : ""}`}
                  href={`/dashboard/${label === "Guest list" ? "guests" : label === "Invitations & RSVP" ? "rsvp" : label.toLowerCase().replaceAll(" ", "-")}?workspace=${workspaceId}`}
                  aria-current={
                    active ===
                    (label === "Guest list"
                      ? "guests"
                      : label === "Invitations & RSVP"
                        ? "rsvp"
                        : label.toLowerCase().replaceAll(" ", "-"))
                      ? "page"
                      : undefined
                  }
                  onClick={() => setOpen(false)}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ) : (
                <span
                  className={styles.navItem}
                  key={label}
                  aria-disabled="true"
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  <small className={styles.comingSoon}>
                    {label === "Events" ||
                    label === "Tasks" ||
                    label === "Guest list"
                      ? "Set up first"
                      : "Soon"}
                  </small>
                </span>
              ),
            )}
          </div>
        ))}
        <div className={styles.navGroup}>
          <p className={styles.navGroupLabel}>Settings</p>
          <Link
            className={`${styles.navItem} ${styles.navItemLink}`}
            href={`${overview}#wedding-title`}
            onClick={() => setOpen(false)}
          >
            <Settings2 size={16} />
            Wedding details
          </Link>
          {workspaceId ? (
            <Link
              className={`${styles.navItem} ${styles.navItemLink} ${active === "members" ? styles.navItemActive : ""}`}
              href={`/dashboard/members?workspace=${workspaceId}`}
              aria-current={active === "members" ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <UsersRound size={16} />
              Wedding members
            </Link>
          ) : (
            <span className={styles.navItem} aria-disabled="true">
              <UsersRound size={16} />
              Members<small className={styles.comingSoon}>Set up first</small>
            </span>
          )}
        </div>
      </nav>
      <div className={styles.sidebarBottom}>
        <div className={styles.sidebarRule} />
        <div className={styles.sidebarAccount}>
          <span className={styles.avatar}>
            {fullName.slice(0, 1).toUpperCase()}
          </span>
          <span className={styles.accountText}>
            <strong>{fullName}</strong>
            <small>{accountRole}</small>
          </span>
        </div>
      </div>
    </aside>
  );
}

export function DashboardHeader({ title }: { title: string }) {
  return (
    <header className={styles.topbar}>
      <div className={styles.breadcrumb}>
        Wedding suite <span aria-hidden="true">/</span> <span>{title}</span>
      </div>
      <div className={styles.topbarActions}>
        <span className={styles.ownerGreeting}>
          A little progress, every day.
        </span>
        <SignOutButton />
      </div>
    </header>
  );
}
