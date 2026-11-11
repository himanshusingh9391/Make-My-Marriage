"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./dashboard.module.css";

export default function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function signOut() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/v1/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("We couldn’t sign you out. Please try again.");
      router.replace("/sign-in");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "We couldn’t sign you out. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className={styles.signOutWrap}>
      <button className={styles.signOutButton} type="button" onClick={signOut} disabled={pending}>
        <LogOut size={16} aria-hidden="true" />
        <span>{pending ? "Signing out…" : "Log out"}</span>
      </button>
      {error && <span className={styles.signOutError} role="status">{error}</span>}
    </div>
  );
}
