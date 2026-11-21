import GuestEditor from "../guest-editor";
export const metadata = { title: "Add a guest | Make My Marriage" };
export default async function NewGuestPage({
  searchParams,
}: {
  searchParams: Promise<{
    workspace?: string;
    edit?: string;
    eventId?: string;
  }>;
}) {
  return <GuestEditor {...await searchParams} />;
}
