"use client";
import { useState } from "react";
import QRCode from "qrcode";
import styles from "./qr.module.css";
export default function GuestQR({ id }: { id: string }) {
  const [link, setLink] = useState(""),
    [qr, setQr] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function manage(revoke: boolean) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/v1/weddings/" + id + "/guest-qr", {
        method: revoke ? "DELETE" : "POST",
      });
      const result = await res.json();
      if (!res.ok)
        throw Error(result.error?.message ?? "Could not update the QR.");
      setLink("");
      setQr("");
      if (revoke) {
        setMessage("Guest access revoked for this wedding.");
        return;
      }
      const origin = process.env.NEXT_PUBLIC_APP_URL;
      const url = new URL(
        result.data.path,
        origin && !/localhost|127\.0\.0\.1/.test(origin)
          ? origin
          : window.location.origin,
      ).href;
      setLink(url);
      setQr(await QRCode.toDataURL(url, { width: 384, margin: 4 }));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className={styles.card}>
      <h1>Guest QR</h1>
      <p>Share a photo album with guests at your celebration.</p>
      <p>
        Guests choose an event after scanning. Each code lasts 30 days. Creating
        a code replaces any earlier code for this album.
      </p>
      <div className={styles.actions}>
        <button disabled={busy} onClick={() => manage(false)}>
          Create QR code
        </button>
        <button disabled={busy} onClick={() => manage(true)}>
          Revoke access
        </button>
      </div>
      {qr && (
        <img
          className={styles.qr}
          src={qr}
          alt="Scan to open the guest photo album"
        />
      )}
      {link && (
        <div className={styles.actions}>
          <a href={link}>Open guest album</a>
          {qr && (
            <a href={qr} download="wedding-guest-qr.png">
              Download QR code
            </a>
          )}
        </div>
      )}
      {link && /localhost|127\.0\.0\.1/.test(new URL(link).hostname) && (
        <p>
          For phone scans, open the dashboard using an address your guests can
          reach before creating the code.
        </p>
      )}

      <p role="status">{message}</p>
    </article>
  );
}
