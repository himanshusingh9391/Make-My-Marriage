"use client";
import Link from "next/link";
import common from "../events/events.module.css";
export default function GuestError({ retry }: { retry: () => void }) {
  return (
    <section className={common.card} role="alert">
      <h2>We couldn’t load your guests</h2>
      <p>Please try again. Your existing guests have not been removed.</p>
      <div className={common.actions}>
        <button className={common.primary} onClick={retry}>
          Try again
        </button>
        <Link className={common.secondary} href="/dashboard">
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}
