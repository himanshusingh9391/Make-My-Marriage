import { notFound } from "next/navigation";
import {
  resolveAlbum,
  guestEventChoices,
} from "@/features/gallery/guest-access";
import { listAlbumPhotos } from "@/features/gallery/service";
import { AppError } from "@/lib/http/app-error";
import Upload from "./upload";
import { downloadUrl } from "@/features/gallery/guest-validation";
import styles from "@/app/dashboard/guest-qr/qr.module.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Guest photo album | Make My Marriage",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const album = await resolveAlbum(token).catch((e) => {
    if (e instanceof AppError && e.code === "ALBUM_UNAVAILABLE") notFound();
    throw e;
  });
  const photos = await listAlbumPhotos(
    album.weddingId,
    album.weddingWide ? undefined : album.eventId,
  );
  return (
    <main className={styles.card}>
      <h1>{album.title}</h1>
      <p>
        Share your photos from the celebration. Anyone with this album link can
        view and download the guest photos here.
      </p>
      <Upload
        token={token}
        events={
          album.weddingWide ? await guestEventChoices(album.weddingId) : null
        }
      />
      <h2>Guest photos ({photos.length})</h2>
      {!photos.length && <p>Be the first to share a memory.</p>}
      <div className={styles.photos}>
        {photos.map((p, i) => (
          <figure key={p.secureUrl}>
            <img
              loading="lazy"
              src={p.secureUrl}
              alt={"Celebration photo " + (i + 1)}
            />
            <a href={downloadUrl(p.secureUrl)} download>
              Download photo {i + 1}
            </a>
          </figure>
        ))}
      </div>
    </main>
  );
}
