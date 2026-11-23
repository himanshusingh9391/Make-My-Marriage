import { notFound } from "next/navigation";
import { getPublicWeddingPhotoContext } from "@/features/weddings/website-service";
import { AppError } from "@/lib/http/app-error";
import { listAlbumPhotos } from "@/features/gallery/service";
import PhotoUpload from "./photo-upload";
import styles from "./photos.module.css";

export const dynamic = "force-dynamic";

export default async function SharedWeddingPhotosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const context = await getPublicWeddingPhotoContext(slug).catch((error) => {
    if (error instanceof AppError && error.statusCode === 404) notFound();
    throw error;
  });
  const photos = await listAlbumPhotos(context.weddingId, undefined);
  return <main className={styles.page}>
    <a className={styles.back} href={`/wedding/${encodeURIComponent(slug)}`}>← Back to the wedding</a>
    <header><span>SHARED WEDDING ALBUM</span><h1>{context.weddingName}</h1><p>Share a favourite moment from the celebration. No account is needed.</p></header>
    <PhotoUpload slug={slug} events={context.events.map(({ eventKey, name }) => ({ eventKey, name }))} />
    <section className={styles.gallery}><h2>Shared moments</h2>{photos.length ? <div>{photos.map((photo, index) => <a key={index} href={photo.secureUrl} target="_blank" rel="noreferrer"><img src={photo.secureUrl} alt={`Shared wedding photo ${index + 1}`} loading="lazy" /></a>)}</div> : <p>Photos shared by guests will appear here.</p>}</section>
    <footer>Make My Marriage · A shared space for your celebration</footer>
  </main>;
}
