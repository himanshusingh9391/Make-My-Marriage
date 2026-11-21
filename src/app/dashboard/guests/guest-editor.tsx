import Link from "next/link";
import { notFound } from "next/navigation";
import { AppError } from "@/lib/http/app-error";
import { getGuest, guestOptions } from "@/features/guests/service";
import { guestIdSchema } from "@/features/guests/schemas";
import {
  loadPlanningWorkspace,
  PlanningWorkspace,
} from "../components/planning-workspace";
import { PlanningHeading } from "../components/planning-form";
import LiveRsvpRefresh from "../components/live-rsvp-refresh";
import GuestForm from "./guest-form";
import RsvpShare from "./rsvp-share";
import { getRsvpLinkState } from "@/features/rsvp/service";
import common from "../events/events.module.css";
export default async function GuestEditor({
  workspace,
  guestId,
  edit,
}: {
  workspace?: string;
  guestId?: string;
  edit?: string;
}) {
  const context = await loadPlanningWorkspace(workspace);
  const weddingId = context.dashboard.wedding.id;
  const options = await guestOptions(context.user._id, weddingId);
  let guest;
  if (guestId) {
    if (!guestIdSchema.safeParse(guestId).success) notFound();
    try {
      guest = await getGuest(context.user._id, weddingId, guestId);
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 404) notFound();
      throw error;
    }
  }
  const linkState = guest
    ? await getRsvpLinkState(context.user._id, weddingId, guest.id)
    : null;
  const archived = context.dashboard.wedding.status === "ARCHIVED";
  const readOnly = archived || Boolean(guest && edit !== "1");
  return (
    <PlanningWorkspace context={context} title="Guests" active="guests">
      <Link
        href={`/dashboard/guests?workspace=${weddingId}`}
        className={common.back}
      >
        ← Back to guests
      </Link>
      <PlanningHeading
        eyebrow="PLANNING TOGETHER"
        title={guest ? "Guest details" : "Add a guest"}
        description="Create a place for every person and family in your celebration."
        action={
          guest && readOnly && !archived ? (
            <Link
              className={common.primary}
              href={`/dashboard/guests/${guest.id}?workspace=${weddingId}&edit=1`}
            >
              Edit guest
            </Link>
          ) : undefined
        }
      />
      {archived && (
        <p className={common.notice}>
          This wedding is archived. Guests are read-only.
        </p>
      )}
      {guest && linkState && edit !== "1" && (
        <RsvpShare
          weddingId={weddingId}
          guestId={guest.id}
          guestName={guest.fullName}
          initial={linkState}
          readOnly={archived}
        />
      )}
      {readOnly && <LiveRsvpRefresh />}
      <GuestForm
        key={`${guest?.id ?? "new"}-${edit ?? "view"}`}
        weddingId={weddingId}
        options={options}
        guest={guest}
        readOnly={readOnly}
      />
    </PlanningWorkspace>
  );
}
