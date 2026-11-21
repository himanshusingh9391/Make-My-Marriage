import Link from "next/link";
import LiveRsvpRefresh from "../components/live-rsvp-refresh";
import { notFound } from "next/navigation";
import {
  loadPlanningWorkspace,
  PlanningWorkspace,
} from "../components/planning-workspace";
import { PlanningHeading } from "../components/planning-form";
import { guestQuerySchema } from "@/features/guests/schemas";
import { listGuests, guestOptions } from "@/features/guests/service";
import GuestList from "./guest-list";
import common from "../events/events.module.css";
export const metadata = { title: "Guests | Make My Marriage" };
export default async function GuestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (params.workspace && typeof params.workspace !== "string") notFound();
  const context = await loadPlanningWorkspace(params.workspace);
  const raw = Object.fromEntries(
    ["q", "eventId", "rsvpStatus", "page"]
      .filter((key) => params[key] !== undefined && params[key] !== "")
      .map((key) => [key, params[key]]),
  );
  const parsed = guestQuerySchema.safeParse(raw);
  if (!parsed.success) notFound();
  const weddingId = context.dashboard.wedding.id;
  const [data, options] = await Promise.all([
    listGuests(context.user._id, weddingId, parsed.data),
    guestOptions(context.user._id, weddingId),
  ]);
  const readOnly = context.dashboard.wedding.status === "ARCHIVED";
  return (
    <PlanningWorkspace context={context} title="Guests" active="guests">
      <LiveRsvpRefresh />
      <PlanningHeading
        eyebrow="PLANNING / GUESTS"
        title="Wedding guests"
        description="Bring your favourite people into the celebration."
        action={
          !readOnly && (
            <Link
              className={common.primary}
              href={`/dashboard/guests/new?workspace=${weddingId}`}
            >
              + Add guest
            </Link>
          )
        }
      />
      {readOnly && (
        <p className={common.notice}>
          This wedding is archived. Guests are available to view only.
        </p>
      )}
      <GuestList
        key={`${weddingId}-${JSON.stringify(parsed.data)}`}
        data={data}
        options={options}
        query={parsed.data}
        weddingId={weddingId}
        readOnly={readOnly}
        saved={params.saved === "1"}
      />
    </PlanningWorkspace>
  );
}
