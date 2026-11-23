import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { environment } from "@/lib/env/env";
import SiteLogo from "@/app/site-logo";
import { getPublicWeddingWebsite } from "@/features/weddings/website-service";
import { AppError } from "@/lib/http/app-error";
import { CalendarButton, Lightbox, PhotoShare } from "./public-enhancements";
import styles from "./wedding.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  try {
    const wedding = await getPublicWeddingWebsite((await params).slug);
    return {
      title: `The wedding of ${wedding.partnerOneName} & ${wedding.partnerTwoName}`,
      description:
        wedding.description ||
        `Celebrate with ${wedding.partnerOneName} and ${wedding.partnerTwoName}${wedding.city ? ` in ${wedding.city}` : ""}.`,
    };
  } catch {
    return { title: "Wedding website | Make My Marriage" };
  }
}

function formatDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  }).format(new Date(value));
}

function formatTime(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}

function daysUntil(value: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const today = parts.reduce<Record<string, string>>((result, part) => {
    if (part.type !== "literal") result[part.type] = part.value;
    return result;
  }, {});
  const todayUtc = Date.UTC(
    Number(today.year),
    Number(today.month) - 1,
    Number(today.day),
  );
  const eventDate = new Date(value);
  const eventUtc = Date.UTC(
    eventDate.getUTCFullYear(),
    eventDate.getUTCMonth(),
    eventDate.getUTCDate(),
  );
  return Math.max(0, Math.ceil((eventUtc - todayUtc) / 86400000));
}

function eventTypeLabel(type: string) {
  const labels: Record<string, string> = {
    HALDI: "Haldi",
    MEHENDI: "Mehendi",
    SANGEET: "Sangeet",
    WEDDING: "Wedding day",
    RECEPTION: "Reception",
    CUSTOM: "Celebration",
  };
  return labels[type] ?? "Celebration";
}

function eventSummary(type: string, name: string) {
  if (/engagement/i.test(name))
    return "Celebrate the engagement with family and friends.";
  const summaries: Record<string, string> = {
    HALDI:
      "Join us for blessings, turmeric, and a joyful gathering with family.",
    MEHENDI: "Celebrate with henna, music, and an afternoon among loved ones.",
    SANGEET: "An evening of music, dancing, and celebration together.",
    WEDDING: "Join us for the wedding ceremony and the start of a new chapter.",
    RECEPTION:
      "Celebrate the newlyweds with dinner, heartfelt toasts, and dancing.",
    CUSTOM: "Join us for this special celebration with family and friends.",
  };
  return (
    summaries[type] ?? "Join us to celebrate this special moment together."
  );
}

function getPublicOrigin(requestHeaders: Headers) {
  const configured = environment.APP_URL.trim();
  if (configured && !/localhost|127\.0\.0\.1/i.test(configured)) {
    try {
      const url = new URL(configured);
      if (url.protocol === "https:" || url.protocol === "http:") {
        return url.origin;
      }
    } catch {
      // Fall through to the request host when an invalid URL is configured.
    }
  }

  const host = (
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    ""
  )
    .split(",")[0]
    .trim();
  const forwardedProtocol = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")[0]
    .trim();
  if (host) {
    try {
      const url = new URL(`${forwardedProtocol || "http"}://${host}`);
      if (url.protocol === "https:" || url.protocol === "http:") {
        return url.origin;
      }
    } catch {
      // Use the local fallback below if the request host is malformed.
    }
  }
  return "http://localhost:3000";
}

export default async function WeddingWebsitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const wedding = await getPublicWeddingWebsite(slug).catch((error) => {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    throw error;
  });
  const activeQrUrl = wedding.guestQrPath
    ? new URL(wedding.guestQrPath, getPublicOrigin(await headers())).href
    : null;
  const activeQrDataUrl = activeQrUrl
    ? await QRCode.toDataURL(activeQrUrl, { width: 384, margin: 4 }).catch(
        () => null,
      )
    : null;
  const date = wedding.weddingDate
    ? formatDate(wedding.weddingDate, wedding.timezone)
    : null;
  const mapHref = (name: string, address: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, address].filter(Boolean).join(", "))}`;

  return (
    <main className={styles.site} data-theme={wedding.theme}>
      <header className={styles.header}>
        <SiteLogo />
        <nav aria-label="Wedding website">
          <a href="#story">Our story</a>
          <a href="#events">Celebrations</a>
          {wedding.showGallery && <a href="#gallery">Gallery</a>}
          <a href="#share-photos">Photo sharing</a>
        </nav>
      </header>

      <section className={styles.hero} id="story">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>A celebration of love</p>
            <h1>
              The union of{" "}
              <em>
                {wedding.partnerOneName} &amp; {wedding.partnerTwoName}
              </em>
            </h1>
            <p className={styles.heroDescription}>
              {wedding.description ||
                `With joy in our hearts, we invite you to celebrate this special beginning with ${wedding.partnerOneName} and ${wedding.partnerTwoName}.`}
            </p>
            <div className={styles.heroFacts}>
              {date && (
                <div>
                  <span>Wedding date</span>
                  <strong>
                    {date}
                    {wedding.dateIsTentative ? " · Tentative" : ""}
                  </strong>
                </div>
              )}
              {wedding.city && (
                <div>
                  <span>Location</span>
                  <strong>{wedding.city}</strong>
                </div>
              )}
              {wedding.events.length > 0 && (
                <div>
                  <span>Celebrations</span>
                  <strong>
                    {wedding.events.length}{" "}
                    {wedding.events.length === 1 ? "event" : "events"}
                  </strong>
                </div>
              )}
            </div>
            <div className={styles.heroActions}>
              <a className={styles.primaryButton} href="#events">
                Explore the itinerary <span aria-hidden="true">→</span>
              </a>
              {wedding.showGallery && (
                <a className={styles.secondaryButton} href="#gallery">
                  View the moments
                </a>
              )}
            </div>
          </div>
          <div className={styles.heroVisual}>
            {wedding.heroImage ? (
              <img
                className={styles.heroImage}
                src={wedding.heroImage}
                alt={`Wedding celebration of ${wedding.partnerOneName} and ${wedding.partnerTwoName}`}
                fetchPriority="high"
              />
            ) : (
              <div className={styles.heroPlaceholder}>
                <span aria-hidden="true">♡</span>
                <p>
                  {wedding.partnerOneName} &amp; {wedding.partnerTwoName}
                </p>
                <small>
                  The Engagement event photo will appear here when it is added
                  to the gallery.
                </small>
              </div>
            )}
            {date && (
              <div className={styles.imageCaption}>
                <span>
                  {wedding.partnerOneName} &amp; {wedding.partnerTwoName}
                </span>
                <span>{date}</span>
              </div>
            )}
            <span className={styles.heroOrnament} aria-hidden="true">
              ✳
            </span>
          </div>
        </div>
      </section>

      {wedding.weddingDate && (
        <section
          className={styles.countdownBand}
          aria-label="Wedding countdown"
        >
          <div>
            <span>Counting down to the celebration</span>
            <strong>
              {daysUntil(wedding.weddingDate, wedding.timezone)}{" "}
              <small>days</small>
            </strong>
          </div>
          <p>Every thoughtful detail brings the day a little closer.</p>
        </section>
      )}

      <section className={styles.events} id="events">
        <div className={styles.sectionHeading}>
          <span>THE CELEBRATION</span>
          <h2>Wedding celebrations</h2>
          <p>
            Each gathering has its own place in the story. We look forward to
            celebrating with you.
          </p>
        </div>
        {wedding.events.length > 0 ? (
          <div className={styles.eventList}>
            {wedding.events.map((event, index) => (
              <article className={styles.eventRow} key={event.eventKey}>
                <div className={styles.eventDate}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{formatDate(event.startDate, event.timezone)}</strong>
                  <small>
                    {formatTime(event.startDate, event.timezone)}
                    {event.endDate
                      ? ` – ${formatTime(event.endDate, event.timezone)}`
                      : ""}
                  </small>
                </div>
                <div className={styles.eventDetails}>
                  <span className={styles.eventType}>
                    {eventTypeLabel(event.type)}
                  </span>
                  <h3>{event.name}</h3>
                  {event.description && <p>{event.description}</p>}
                  {!event.description && (
                    <p>{eventSummary(event.type, event.name)}</p>
                  )}
                  {event.dressCode && (
                    <small className={styles.attire}>
                      Attire · {event.dressCode}
                    </small>
                  )}
                  <CalendarButton event={event} />
                </div>
                {event.image && (
                  <img
                    className={styles.eventImage}
                    src={event.image}
                    alt={`${event.name} wedding memory`}
                    loading="lazy"
                  />
                )}
                {(event.venueName || event.venueAddress) && (
                  <a
                    className={styles.venue}
                    href={mapHref(event.venueName, event.venueAddress)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span aria-hidden="true">⌖</span>
                    <span>
                      <strong>{event.venueName || "Event venue"}</strong>
                      {event.venueAddress && (
                        <small>{event.venueAddress}</small>
                      )}
                      <small>View location ↗</small>
                    </span>
                  </a>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <span aria-hidden="true">✳</span>
            <h3>Celebration details are being prepared</h3>
            <p>
              Event dates, venues, and dress details will appear here once they
              are added to the wedding itinerary.
            </p>
          </div>
        )}
      </section>

      {wedding.showGallery && (
        <section className={styles.gallery} id="gallery">
          <div className={styles.sectionHeading}>
            <span>MOMENTS OF THE MARRIAGE</span>
            <h2>An heirloom visual chronicle</h2>
            <p>Real moments from the celebrations, gathered in one place.</p>
          </div>
          {wedding.events.length > 0 ? (
            <div className={styles.chronicleGrid}>
              {wedding.events.map((event) => (
                <article className={styles.chronicleCard} key={event.eventKey}>
                  {event.image ? (
                    <img
                      className={styles.chronicleImage}
                      src={event.image}
                      alt={`${event.name} celebration`}
                      loading="lazy"
                    />
                  ) : (
                    <div className={styles.chronicleImagePlaceholder}>
                      <span aria-hidden="true">♡</span>
                      <small>
                        Add a {event.name} photo to its event in the Gallery.
                      </small>
                    </div>
                  )}
                  <div className={styles.chronicleDetails}>
                    <span>{eventTypeLabel(event.type)}</span>
                    <h3>{event.name}</h3>
                    <p>
                      {event.description ||
                        eventSummary(event.type, event.name)}
                    </p>
                    <small>
                      {formatDate(event.startDate, event.timezone)} ·{" "}
                      {formatTime(event.startDate, event.timezone)}
                    </small>
                    {(event.venueName || event.venueAddress) && (
                      <small>
                        {event.venueName}
                        {event.venueName && event.venueAddress ? " · " : ""}
                        {event.venueAddress}
                      </small>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : wedding.galleryItems.length > 0 ? (
            <Lightbox
              images={wedding.galleryItems.map((item) => item.src)}
              captions={wedding.galleryItems.map((item) => item.eventName)}
            />
          ) : (
            <div className={styles.emptyState}>
              <h3>Your memories begin here</h3>
              <p>Photos added to the gallery will appear here.</p>
            </div>
          )}
          {wedding.additionalGalleryItems.length > 0 && (
            <div className={styles.moreMemories}>
              <h3>More wedding memories</h3>
              <Lightbox
                images={wedding.additionalGalleryItems.map((item) => item.src)}
                captions={wedding.additionalGalleryItems.map(
                  (item) => item.eventName,
                )}
              />
            </div>
          )}
        </section>
      )}

      <section className={styles.sharePhotos} id="share-photos">
        <div className={styles.sectionHeading}>
          <span>GUEST MEMORIES &amp; LIVE ALBUM</span>
          <h2>Scan to share your moments</h2>
          <p>
            Use the current guest QR to upload photos from any device. No
            account is needed.
          </p>
        </div>
        <PhotoShare
          path={wedding.guestQrPath}
          shareUrl={activeQrUrl}
          qrDataUrl={activeQrDataUrl}
        />
      </section>

      {wedding.livestreamUrl && (
        <section className={styles.livestream}>
          <span>CELEBRATE WITH US, WHEREVER YOU ARE</span>
          <h2>Join the live celebration</h2>
          <a
            className={styles.primaryButton}
            href={wedding.livestreamUrl}
            target="_blank"
            rel="noreferrer"
          >
            Watch the livestream <span aria-hidden="true">↗</span>
          </a>
        </section>
      )}

      <footer className={styles.footer}>
        <SiteLogo />
        <p>
          Made with love for {wedding.partnerOneName} &amp;{" "}
          {wedding.partnerTwoName}
          {wedding.city ? ` · ${wedding.city}` : ""}
        </p>
        {date && (
          <small>
            {date}
            {wedding.dateIsTentative ? " · Tentative" : ""}
          </small>
        )}
      </footer>
    </main>
  );
}
