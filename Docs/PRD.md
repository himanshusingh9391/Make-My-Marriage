# Make My Marriage — Product Requirements Document (PRD)
**Version:** 2.0 | **Status:** Draft for review | **Market:** India | **Language:** English

## 1. Product overview
Make My Marriage is a wedding-planning web application. A registered user can own multiple wedding workspaces. Each workspace isolates its events, guests, invitations, RSVPs, tasks, actual expenses, vendors, public wedding website, and gallery.

## 2. Goals
- Secure registration, email verification, login, logout, password reset.
- Create and manage multiple wedding workspaces with strict owner/data isolation.
- Manage events and venues; guest records and event assignments; guest-specific invitation links and event RSVPs.
- Provide planning dashboard, tasks, actual expense register, vendor directory, check-in, email invitations/reminders, public wedding site and gallery.
- Preserve guest privacy and support responsive accessible UI.

## 3. User types
**Wedding owner:** verified registered user, owns one or more weddings; sole owner per wedding in v2.0.
**Guest:** no platform account; invitation-token access to own assigned events and RSVPs, plus public/authorized gallery content.
**Platform operator:** no product dashboard in initial release; privileged operational access is restricted and audited.

## 4. Scope
### In scope
Auth; wedding workspace/details/settings; events/venues; guest CRUD and assignments; secure invitations; event-specific RSVP; dashboard; email through Resend; check-in; task planner; actual expense register; saved vendor directory with Google Places discovery; published wedding site; WhatsApp copy/share only; albums/photos with Cloudflare R2.
### Out of scope
Collaborator/family roles, vendor accounts/marketplace transactions, payment processing, budget forecasting/remaining-budget calculations, WhatsApp Business API, native apps, subscription billing, AI planning, public guest registration, guest social network.

## 5. Functional requirements
- **AUTH:** Normalize and uniquely enforce email; Argon2id password hashing; secure cookie session; session revocation; single-use time-limited hashed verification/reset tokens; rate-limit auth; verify email before publication/invitations.
- **WEDDING:** Create multiple workspaces; unique slug; owner reference; list/select; details update; archive lifecycle; all access checks derive owner from authenticated session.
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
Onboarding: register → verify email → login → create wedding → settings → dashboard.
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
Verified auth lifecycle works; users create multiple weddings; owner-only access enforced; event/guest/assignment/RSVP rules validated; dashboards correct; invitations/reminders idempotent; check-in/tasks/expenses/vendors usable; site publication privacy upheld; gallery uploads/downloads authorized; expiry/revocation enforced; automated cross-wedding security tests pass.

## 10. Release phases
1 Auth, ownership, workspace, database, core authorization.
2 Settings, events/venues, guests, assignments, RSVP.
3 Email, token lifecycle, share links.
4 Tasks, expenses, vendors, check-in.
5 Public website, themes, countdown, livestream, gallery.
6 Security/performance tests, deploy, monitoring, backup restore.

## 11. Future
Collaborators/RBAC, planner accounts, guest accounts, SMS/WhatsApp API, subscriptions, multi-currency, multilingual, advanced analytics, AI planning.
