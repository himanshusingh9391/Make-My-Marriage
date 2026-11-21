import GuestEditor from "../guest-editor";
export const metadata = { title: "Guest details | Make My Marriage" };
export default async function GuestDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ guestId: string }>;
  searchParams: Promise<{ workspace?: string; edit?: string }>;
}) {
  return <GuestEditor {...await params} {...await searchParams} />;
}
