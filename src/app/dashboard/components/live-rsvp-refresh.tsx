"use client";
import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Refresh server-owned summaries without reloading the page or resetting forms. */
export default function LiveRsvpRefresh() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    const refresh = () => {
      if (
        pending ||
        document.visibilityState !== "visible" ||
        document.querySelector('dialog[open], [data-unsaved="true"]') ||
        document.activeElement?.closest("form")
      )
        return;
      startTransition(() => router.refresh());
    };
    const timer = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("wedding-rsvp-updates")
        : null;
    if (channel) channel.onmessage = refresh;
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      channel?.close();
    };
  }, [router, pending]);
  return null;
}
