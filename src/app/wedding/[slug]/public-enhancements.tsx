"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./wedding.module.css";

type WeddingEvent = {
  name: string;
  description: string;
  startDate: string;
  endDate: string | null;
  timezone: string;
  venueName: string;
  venueAddress: string;
};

function escapeCalendar(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function CalendarButton({ event }: { event: WeddingEvent }) {
  function downloadCalendar() {
    const start = new Date(event.startDate)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
    const end = new Date(
      event.endDate ??
        new Date(new Date(event.startDate).getTime() + 2 * 60 * 60 * 1000),
    )
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
    const details = [event.description, event.venueName, event.venueAddress]
      .filter(Boolean)
      .join("\n");
    const content = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Make My Marriage//Wedding//EN",
      "BEGIN:VEVENT",
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeCalendar(event.name)}`,
      `DESCRIPTION:${escapeCalendar(details)}`,
      `LOCATION:${escapeCalendar([event.venueName, event.venueAddress].filter(Boolean).join(", "))}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/calendar;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${event.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "wedding-event"}.ics`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      className={styles.calendarButton}
      type="button"
      onClick={downloadCalendar}
    >
      Add to calendar
    </button>
  );
}

export function PhotoShare({
  path,
  shareUrl,
  qrDataUrl,
}: {
  path: string | null;
  shareUrl: string | null;
  qrDataUrl: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (!shareUrl) return;
    if (navigator.share) {
      await navigator
        .share({ title: "Share wedding photos", url: shareUrl })
        .catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div className={styles.shareCard}>
      {qrDataUrl && (
        <img
          src={qrDataUrl}
          alt="The current guest photo QR code"
          width={192}
          height={192}
        />
      )}
      {!qrDataUrl && (
        <div className={styles.qrPlaceholder} role="status">
          <span aria-hidden="true">▦</span>
          <strong>Guest QR not active</strong>
          <small>
            The wedding team can create or refresh it from the dashboard.
          </small>
        </div>
      )}
      <div>
        <strong>Keep the memories coming</strong>
        <p>
          {path
            ? "Scan or share the same active guest QR from your wedding dashboard. Anyone with the link can upload a photo."
            : "Create a guest QR in your wedding dashboard to open photo sharing here."}
        </p>
        {path && shareUrl && (
          <div className={styles.shareActions}>
            <a className={styles.stream} href={shareUrl}>
              Open guest album
            </a>
            <button type="button" onClick={() => void share()}>
              {copied ? "Link copied" : "Share album"}
            </button>
            <a
              className={styles.qrDownload}
              href={qrDataUrl ?? undefined}
              download="wedding-guest-qr.png"
            >
              Download QR
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

export function Lightbox({
  images,
  captions = [],
}: {
  images: string[];
  captions?: string[];
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const image = useMemo(
    () => (selected === null ? null : images[selected]),
    [images, selected],
  );
  useEffect(() => {
    if (selected === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
      if (event.key === "ArrowRight")
        setSelected((value) =>
          value === null ? 0 : (value + 1) % images.length,
        );
      if (event.key === "ArrowLeft")
        setSelected((value) =>
          value === null ? 0 : (value - 1 + images.length) % images.length,
        );
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [images.length, selected]);

  return (
    <>
      <div className={styles.photoGrid}>
        {images.map((src, index) => (
          <button
            key={src}
            type="button"
            onClick={() => setSelected(index)}
            aria-label={`View ${captions[index] || `wedding memory ${index + 1}`}`}
          >
            <img
              src={src}
              alt={captions[index] || `Wedding memory ${index + 1}`}
              loading="lazy"
            />
            <span>{captions[index] || "Wedding memories"}</span>
          </button>
        ))}
      </div>
      {image && (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Wedding photo viewer"
          onClick={() => setSelected(null)}
        >
          <button
            className={styles.lightboxClose}
            type="button"
            onClick={() => setSelected(null)}
            aria-label="Close photo"
          >
            ×
          </button>
          <button
            className={styles.lightboxPrev}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setSelected((selected! - 1 + images.length) % images.length);
            }}
            aria-label="Previous photo"
          >
            ‹
          </button>
          <img
            src={image}
            alt="Selected wedding memory"
            onClick={(event) => event.stopPropagation()}
          />
          <button
            className={styles.lightboxNext}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setSelected((selected! + 1) % images.length);
            }}
            aria-label="Next photo"
          >
            ›
          </button>
        </div>
      )}
    </>
  );
}
