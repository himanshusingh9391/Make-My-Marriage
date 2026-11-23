"use client";
import { useRef, useState } from "react";
import { Download, ImagePlus, Trash2, Upload, X } from "lucide-react";
import styles from "./gallery.module.css";
import { downloadUrl } from "@/features/gallery/guest-validation";
export default function GalleryClient({
  canDelete,
  weddingId,
  events,
  initial,
}: {
  canDelete: boolean;
  weddingId: string;
  events: { id: string; name: string }[];
  initial: { _id: string; secureUrl: string; eventId: string | null }[];
}) {
  const [photos, setPhotos] = useState(initial),
    [filter, setFilter] = useState(""),
    [selected, setSelected] = useState<(typeof initial)[number] | null>(null),
    [open, setOpen] = useState(false),
    [files, setFiles] = useState<File[]>([]),
    [eventId, setEventId] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const visible =
    filter === "other"
      ? photos.filter((photo) => !photo.eventId)
      : filter
        ? photos.filter((photo) => photo.eventId === filter)
        : photos;
  async function submit() {
    if (!files.length) return;
    setBusy(true);
    setError("");
    const data = new FormData();
    files.forEach((file) => data.append("photos", file));
    if (eventId) data.set("eventId", eventId);
    const response = await fetch(`/api/v1/weddings/${weddingId}/photos`, {
      method: "POST",
      body: data,
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok || !result.success)
      return setError(result.error?.message ?? "Upload failed.");
    setPhotos((current) => [...result.data, ...current]);
    setFiles([]);
    setOpen(false);
  }
  async function remove() {
    if (!selected || !confirming) return;
    setBusy(true);
    const response = await fetch(
      `/api/v1/weddings/${weddingId}/photos/${selected._id}`,
      { method: "DELETE" },
    );
    const result = await response.json();
    setBusy(false);
    if (!response.ok || !result.success)
      return setError(result.error?.message ?? "Delete failed.");
    setPhotos((current) =>
      current.filter((photo) => photo._id !== selected._id),
    );
    setConfirming(false);
    setSelected(null);
  }
  return (
    <>
      <div className={styles.heading}>
        <div>
          <p>YOUR CELEBRATION, REMEMBERED</p>
          <h1>Wedding Gallery</h1>
          <span>
            All your wedding memories, beautifully gathered in one place.
          </span>
        </div>
        <button onClick={() => setOpen(true)}>
          <Upload size={16} /> Upload photos
        </button>
      </div>
      {photos.length ? (
        <>
          <div className={styles.filters} aria-label="Filter photos">
            <button
              className={!filter ? styles.active : ""}
              onClick={() => setFilter("")}
            >
              All photos
            </button>
            {events.map((event) => (
              <button
                key={event.id}
                className={filter === event.id ? styles.active : ""}
                onClick={() => setFilter(event.id)}
              >
                {event.name}
              </button>
            ))}
            <button
              className={filter === "other" ? styles.active : ""}
              onClick={() => setFilter("other")}
            >
              Wedding Memories
            </button>
          </div>
          {visible.length ? (
            <div className={styles.grid}>
              {visible.map((photo) => (
                <button
                  className={styles.card}
                  key={photo._id}
                  onClick={() => setSelected(photo)}
                >
                  <img src={photo.secureUrl} alt="Wedding memory" />
                </button>
              ))}
            </div>
          ) : (
            <p className={styles.noResults}>
              No photos in this collection yet.
            </p>
          )}
        </>
      ) : (
        <section className={styles.empty}>
          <ImagePlus size={42} />
          <p>EVERY PHOTO TELLS YOUR STORY</p>
          <h2>Your memories begin here</h2>
          <span>
            From the first celebration to the last dance, give your favourite
            moments a home.
          </span>
          <button onClick={() => setOpen(true)}>
            + Upload your first photos
          </button>
        </section>
      )}
      {selected && (
        <div className={styles.overlay}>
          <section className={styles.viewer} aria-label="Photo viewer">
            <button
              className={styles.close}
              disabled={busy}
              onClick={() => {
                setConfirming(false);
                setError("");
                setSelected(null);
              }}
            >
              <X />
            </button>
            <img src={selected.secureUrl} alt="Wedding memory" />
            <div className={styles.viewerActions}>
              <a
                href={downloadUrl(selected.secureUrl)}
                download
                target="_blank"
                rel="noreferrer"
              >
                <Download size={16} /> Download
              </a>
              {canDelete && !confirming && (
                <button
                  onClick={() => {
                    setError("");
                    setConfirming(true);
                  }}
                >
                  <Trash2 size={16} /> {busy ? "Deleting…" : "Delete"}
                </button>
              )}
              {confirming && (
                <div
                  role="alertdialog"
                  aria-label="Delete this photo permanently?"
                >
                  <p>Delete this photo permanently?</p>
                  <button disabled={busy} onClick={remove}>
                    {busy ? "Deleting…" : "Delete photo"}
                  </button>
                  {error && <p role="alert">{error}</p>}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
      {open && (
        <div className={styles.overlay}>
          <section className={styles.dialog}>
            <button className={styles.close} onClick={() => setOpen(false)}>
              <X />
            </button>
            <p>A COLLECTION OF MOMENTS</p>
            <h2>Upload photos</h2>
            <span>
              Bring your wedding memories together, one photo at a time.
            </span>
            <div className={styles.drop} onClick={() => input.current?.click()}>
              <ImagePlus size={34} />
              <strong>Drop your photos here</strong>
              <u>or browse files</u>
              <small>JPEG, PNG or WebP · Up to 10 MB each · 20 per batch</small>
              <input
                ref={input}
                hidden
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) =>
                  setFiles(Array.from(e.target.files ?? []).slice(0, 20))
                }
              />
            </div>
            <label>
              Assign these photos to an event (optional)
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
              >
                <option value="">Other / Wedding Memories</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </label>
            {files.map((file) => (
              <div className={styles.file} key={file.name}>
                {file.name}{" "}
                <small>{(file.size / 1024 / 1024).toFixed(1)} MB</small>
              </div>
            ))}
            {error && <p className={styles.error}>{error}</p>}
            <footer>
              <button
                className={styles.secondary}
                onClick={() => setOpen(false)}
              >
                Close
              </button>
              <button disabled={!files.length || busy} onClick={submit}>
                {busy
                  ? "Uploading…"
                  : `Upload ${files.length || ""} photo${files.length === 1 ? "" : "s"}`}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
