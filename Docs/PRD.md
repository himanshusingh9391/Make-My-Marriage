# Make My Marriage — Product Requirements Document (PRD)
**Version:** 2.0 | **Status:** Draft for review | **Market:** India | **Language:** English

## 1. Product overview
Make My Marriage is a wedding-planning web application. A registered user can own multiple wedding workspaces. Each workspace isolates its events, guests, invitations, RSVPs, tasks, actual expenses, vendors, public wedding website, and gallery.

## 2. Goals
- Secure registration, login, logout, password reset; no email verification requirement for signup/login.
- Create and manage multiple wedding workspaces with strict owner/data isolation.
- Manage events and venues; guest records and event assignments; guest-specific invitation links and event RSVPs.
- Provide planning dashboard, tasks, actual expense register, vendor directory, check-in, email invitations/reminders, public wedding site and gallery.
- Preserve guest privacy and support responsive accessible UI.

## 3. User types
**Wedding owner:** verified registered user who owns a wedding workspace.
**Wedding member:** verified registered user invited to a specific wedding as an Admin or Manager.
**Guest:** no platform account; invitation-token access to own assigned events and RSVPs, plus public/authorized gallery content.
**Platform operator:** no product dashboard in initial release; privileged operational access is restricted and audited.

## 4. Scope
### In scope
Auth; wedding workspace/details/settings; events/venues; guest CRUD and assignments; secure invitations; event-specific RSVP; dashboard; email through Resend; check-in; task planner; actual expense register; saved vendor directory with Google Places discovery; published wedding site; WhatsApp copy/share only; albums/photos with Cloudflare R2.
### Out of scope
Member role changes after joining (later increment), vendor accounts/marketplace transactions, payment processing, budget forecasting/remaining-budget calculations, WhatsApp Business API, native apps, subscription billing, AI planning, public guest registration, guest social network.

## 5. Functional requirements
- **AUTH:** Normalize and uniquely enforce email; Argon2id password hashing; secure cookie session; session revocation; single-use time-limited hashed verification/reset tokens; rate-limit auth; signup/login work without email verification; invitations require authenticated access and matching recipient email on acceptance.
- **WEDDING:** Create multiple workspaces; unique slug; owner reference; list/select; details update; archive lifecycle; all access checks derive owner from authenticated session.
- **MEMBERS:** Owner, Admin, or Manager can invite an existing or new account by email as Admin or Manager. Invitations use single-use hashed tokens, expire after 7 days, are delivered through Resend, and can be revoked by an Owner, Admin, or Manager. Acceptance requires an active authenticated account with the invited normalized email. Admins and Managers have the same member and guest invitation permissions. The owner can remove Admins or Managers; Admins and Managers can remove other Managers. The owner and acting user cannot be removed through member management. Role changes are deferred.
- **SETTINGS:** Names, date, timezone, contacts, theme (Elegant & Royal, Minimal & Modern, Traditional Indian), website publish state, description/countdown/livestream, RSVP defaults, gallery visibility, email preferences.
- **EVENTS/VENUES:** Create/edit/cancel/delete Haldi, Mehendi, Sangeet, Wedding, Reception, custom events; start/end/timezone, venue, RSVP deadline, capacity, dress code, notes. Validate start < end. Venue may be selected via Places API.
- **GUESTS:** Guest name; optional email/phone; family/group, notes; status; assign to multiple events. Invitation token is random and only hash stored; revoke/regenerate.
- **RSVP:** One record per guest-event; PENDING/YES/NO; YES count >=1; other statuses count 0; assigned events only; deadline and capacity rules; count includes invited guest; dashboard expected headcount counts YES only.
- **EMAIL:** Resend invitation/reminder, log status, process authenticated webhooks idempotently; deduplicate reminder campaign per guest-event.
- **CHECK-IN:** Arrival status, time, checked-in attendee count and notes, per event.
- **TASKS:** TODO, IN_PROGRESS, COMPLETED, CANCELLED; LOW/MEDIUM/HIGH/URGENT; due date, notes.
- **EXPENSES:** Actual amounts only, integer minor units (INR paise), category, date, optional saved vendor, payment state UNPAID/PARTIALLY_PAID/PAID. No budget projection.
- **VENDORS:** Discover through Places, save only selected results, edit/delete; contact, category, address, website, place ID, rating snapshot, notes.
- **PUBLIC SITE:** Published couple names/date/events/venue/theme/description/countdown/livestream/authorized gallery. Must never expose guest list, contacts, private notes, expenses, tasks, RSVP records, admin data or tokens.
- **GALLERY:** Owner creates albums and access links/QR; validate upload size, MIME, extension and signature; R2 stores bytes, MongoDB stores metadata; owner alone deletes photos.
- **DASHBOARD:** Upcoming events, RSVP totals/rates/headcount, pending invitations/tasks, expense actual totals, recent activity, check-in, all scoped to selected wedding.

## 6. Key user flows
Onboarding: register with full name, email, and password → verify email when required → sign in → enter wedding title and description, partner names, city/place, and tentative wedding date on the dashboard → view and edit the wedding overview and countdown.
Planning: choose workspace → create events → add/assign guests → send invitations → collect RSVP → monitor dashboard → tasks/expenses/vendors/check-in.
Guest: open token link → validate → see assigned events → respond → owner dashboard updates.
Gallery: create album → request upload authorization → owner/workspace authorization → presigned R2 upload → verify object and metadata → authorized delivery.

## 7. Nonfunctional requirements
Security: secure session cookies (HttpOnly, Secure, SameSite), CSRF defense, tenant scoped query enforcement, validation, rate limits, secret management, audit trails, private object storage.
Performance: pagination, indexes led by weddingId, optimized aggregations, thumbnails and signed delivery.
Availability/operations: Vercel, MongoDB Atlas, R2, Resend; monitoring, backup and restore validation.
Accessibility: responsive, keyboard usable, labels, contrast, screen-reader friendly feedback.
Integrity: unique slug/email, guest-event assignment and RSVP, cross-reference validation, idempotent email/webhooks.

## 8. Technology stack
Next.js + TypeScript; Next.js Route Handlers; Node.js; REST JSON `/api/v1`; MongoDB Atlas; Mongoose; Zod; Argon2id; secure cookie sessions; Vercel; Cloudflare R2; Resend; Google Places/Maps URLs; Vitest, integration tests, Playwright; OpenAPI.

## 9. Acceptance criteria
Verified auth lifecycle works; users create multiple weddings; owner and authorized membership access is enforced; event/guest/assignment/RSVP rules are validated; dashboards are correct; invitations/reminders are idempotent; check-in/tasks/expenses/vendors are usable; site publication privacy is upheld; gallery uploads/downloads are authorized; expiry/revocation is enforced; automated cross-wedding security tests pass.

## 10. Release phases
1 Auth, ownership, workspace, database, core authorization.
2 Settings, events/venues, guests, assignments, RSVP.
3 Email, token lifecycle, share links.
4 Tasks, expenses, vendors, check-in.
5 Public website, themes, countdown, livestream, gallery.
6 Security/performance tests, deploy, monitoring, backup restore.

## 11. Future

### 2026-11-19 - Wedding tasks increment

Owners, Admins, and Managers can create, view, edit, change status, and remove tasks in their wedding. The responsive task list has All Tasks, My Tasks (assigned to the signed-in user), Completed, and status/priority/event/member filters. Add task opens a separate page and returns to the task list after saving. Task fields are title, description, optional active member assignment, optional related event, optional due date, priority, status, and optional category/private notes. Only current active wedding members and non-cancelled/non-deleted events can be newly assigned. General/unassigned tasks are supported. Event cards link to their filtered task list.

Due dates are calendar dates in the wedding timezone; unfinished tasks become overdue the day after their due date. Completion sets a server timestamp; reopening clears it. Archived weddings are read-only, and removed tasks disappear from lists/counts. Existing references to removed members or events remain visible for context and can be cleared or reassigned. This increment does not send task notification emails.
Additional member permission levels, planner accounts, guest accounts, SMS/WhatsApp API, subscriptions, multi-currency, multilingual, advanced analytics, AI planning.

### 2026-11-18 - Events implementation increment

- Owners, Admins, and Managers can list, create, edit, cancel, and remove events in their wedding. Archived weddings are read-only.
- The reference-based form includes event name/type, description, required start date/time, optional end date/time, venue name/address, and dress code. Both end fields may be empty; otherwise end must follow start. Overnight events use an explicit following-day end date.
- Optional planning settings retain status, private notes, capacity, and RSVP deadline from the specification. Event-specific assignments/RSVP enforcement, public event publishing, and Places venue search remain later increments; setting PUBLISHED does not publish the wedding website or send emails.
- Wedding timezone is authoritative; timestamps are stored in UTC. Removal retains a soft-deleted record for future history/reference integrity. Removed events are hidden; cancelled events remain visible with their status and do not count as planned events.

### Approved update ? 2026-11-14

Regular signup/login do not send or require verification email. Resend is used for member invitations from the dashboard, with existing password recovery retained. Invited users sign up/sign in and join the existing wedding; the shared dashboard lists owner and members with their roles.

### Approved clarification ? 2026-11-14: invited-member verification

This supersedes the earlier same-day blanket removal of signup verification. Ordinary registration still creates an ACTIVE account without email delivery. Registration from a valid invitation includes optional `nextTo` (restricted to `/invitations/accept?token=...`), validates invitation expiry/status/delivery and recipient email, creates a PENDING_VERIFICATION account, and sends a 24-hour hashed verification token. Pending accounts cannot log in before verification. The verification URL and resend flow preserve the invitation destination. After verification, sign-in accepts the invitation and redirects to its existing wedding dashboard; it creates no wedding. Role comes from the stored invitation and the shared sidebar lists owner then members. Existing active accounts can sign in and accept invitations directly. Failed verification delivery keeps the account pending with a resend option; suspended accounts remain blocked. No new collections or raw token storage are introduced.

### 2026-11-16 ? Separate guest invitations and membership management

Invite Member grants Admin/Manager workspace access. Send Invitation sends relatives an accountless guest acceptance link, never dashboard access. Both track pending/accepted totals. Guest acceptance records receipt/acceptance of the general invitation only, not an event RSVP or attendance count. Event assignments and RSVP remain a separate milestone. No product seat cap is imposed; individual invitations remain subject to rate limits and provider quotas.


### Guest management increment ? 2026-11-19

The Guests screen supports individual/family records, optional contact details, private notes, a maximum party size including the named guest, and selection of wedding events. It includes an empty state, search/event/RSVP filters, a paginated desktop table that stacks into mobile cards, separate add/details/edit pages, and confirmed removal. Owners, Admins, and Managers have the same guest-planning access. Saving a guest does not send an invitation; sending stays on Members. Public event RSVP submission and event-specific capacity editing remain future increments.


### Personal invitation and RSVP increment - 2026-11-21

Guests open a personal /invite/{token} link without signing up or logging in. The reference-based responsive page shows couple details, celebration image, the guest's itinerary, pending/confirmed/declined response summary, Formal RSVP, attendee count including the named guest, optional message, and an update-response action. One response for all open events is the default when their existing responses match; guests can choose different responses for individual events. Closed events remain visible but cannot be changed.

The guest-details screen provides create/copy/preview/WhatsApp share, regenerate, and revoke actions for Owners/Admins/Managers. Each link grants access only to that guest's invitation; it is not a public guest registration link. The Invitations & RSVP screen and dashboard show per-event attendance totals. Guest confirmation is immediate; open team dashboards/guest lists refresh approximately every five seconds, and other open invitation views refresh every fifteen seconds when not editing. Existing fonts/colors/logo are reused. Sharing outside the local computer requires deployment and a public NEXT_PUBLIC_APP_URL.
