import GuestAcceptance from "./guest-acceptance";
export const metadata = { title: "Guest invitation | Make My Marriage", referrer: "no-referrer" };
export default async function GuestInvitationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return <GuestAcceptance token={token} />;
}
