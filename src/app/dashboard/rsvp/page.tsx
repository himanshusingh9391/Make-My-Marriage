import SharedInvitation from "./shared-invitation";
import LiveRsvpRefresh from "../components/live-rsvp-refresh";
import { notFound } from "next/navigation";
import {
  loadPlanningWorkspace,
  PlanningWorkspace,
} from "../components/planning-workspace";
import { PlanningHeading } from "../components/planning-form";
import { getSharedLink } from "@/features/rsvp/shared-links";

import common from "../events/events.module.css";
import { getRsvpOverview } from "@/features/rsvp/service";
export const metadata = { title: "Invitations & RSVP | Make My Marriage" };
export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (params.workspace && typeof params.workspace !== "string") notFound();
  const context = await loadPlanningWorkspace(params.workspace);
  const weddingId = context.dashboard.wedding.id;
  const [link, overview] = await Promise.all([
    getSharedLink(context.user._id, weddingId),
    getRsvpOverview(context.user._id, weddingId),
  ]);
  const readOnly = context.dashboard.wedding.status === "ARCHIVED";
  return (
    <PlanningWorkspace
      context={context}
      title="Invitations & RSVP"
      active="rsvp"
    >
      <LiveRsvpRefresh />
      <PlanningHeading
        eyebrow="GUEST RESPONSE PORTAL"
        title="Invitations & RSVP"
        description="Share personal invitations and follow your guests’ responses."
      />
      {readOnly && (
        <p className={common.notice}>
          This wedding is archived. Guests are available to view only.
        </p>
      )}
      <div className={common.summary}>
        <span>
          <strong>{overview.yes}</strong> Attending responses
        </span>
        <span>
          <strong>{overview.no}</strong> Declined responses
        </span>
        <span>
          <strong>{overview.pending}</strong> Pending responses
        </span>
        <span>
          <strong>{overview.expectedHeadcount}</strong> Confirmed attendance
        </span>
      </div>
      {!readOnly && (
        <SharedInvitation
          key={weddingId}
          weddingId={weddingId}
          initial={link}
        />
      )}
      <p className={common.notice}>
        Shared invitations count each household once. Personal event invitations
        count each response per event.
      </p>
    </PlanningWorkspace>
  );
}
