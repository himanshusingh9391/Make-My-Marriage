# Make My Marriage — Project Status

**Last updated:** 2026-11-17

This file tracks major project milestones. Detailed requirements and architecture remain in `PRD.md`, `System_Design.md`, `DB_Design.md`, and `API_Design.md`.

## Current status

The initial project foundation, responsive public homepage, owner authentication, first-workspace onboarding, editable wedding details, private dashboard, and first increment of wedding member invitations are implemented. Owners, Admins, and Managers can invite users as Admin or Manager through the configured Resend integration; invitations use single-use hashed tokens, seven-day expiry, invited email matching, accept/revoke flows, member visibility, and a selected-workspace landing after acceptance. Live Resend delivery has not been reverified in this review; the shared `resend.dev` testing sender only permits the Resend account recipient, while arbitrary recipients require a verified domain. Managers have the same invitation permissions as Admins. Role changes are deferred; owners can now remove Admin/Manager members and Admins and Managers can remove other Managers. Sign-up collects only the account name, email, and password; after sign-in, the owner can add and edit wedding details on the dashboard. The app targets `mmm-db` by default. The database initialization script now provisions 20 documented collections and their indexes. Local development can register and sign in without Resend; ordinary signup/login work without email verification; new accounts created through invitations must verify their email before signing in. Accountless general guest invitations are implemented; event RSVPs and photo uploads are not implemented yet.

## Completed milestones

### Initial project scaffold — Complete

- Set up the Next.js App Router application with strict TypeScript, linting, formatting, and test configuration.
- Added the versioned REST health endpoint, environment validation, lazy MongoDB connection utility, shared API response/error helpers, and logger.
- Added the product, system, database, and API design documents.

### Responsive wedding homepage — Complete

- Built the sample wedding homepage with the hero, ceremony itinerary, visual chronicle, feast, family blessings, photo-share instructions, guest reviews, and responsive navigation.
- Added the supplied Stitch photos with local image fallbacks, consistent gallery card sizing, and expandable descriptions.
- The page is currently a presentation/demo experience. Authentication, photo uploads, and blessing submission are not connected to backend features.

### Homepage planning snapshot — Complete

- Added a responsive countdown and summary cards for total events, completed tasks, invited guests, and total invested (recorded expenses) below the hero.
- Figures are sample homepage content and are not connected to wedding data or backend features.

### Owner authentication — Implemented; signup persistence verified

- Added responsive Stitch-based sign-in and sign-up screens, email verification, resend verification, password recovery, and reset screens.
- Added versioned auth API routes for registration, login, logout, current user, verification, and password recovery. Registration creates the owner account; wedding details are completed after sign-in.
- Passwords use Argon2id; session and verification/reset tokens are stored as hashes; auth attempts are rate limited.
- Atlas connectivity was verified using the configured `MONGODB_URI`; `mmm-db` was initialized with the documented collections and indexes. The URI is not printed or committed. `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are required for production email verification.
- The local development server uses Webpack because Turbopack failed to create package junctions on this Windows setup. MongoDB connection failures now return a structured 503 response instead of an unhandled 500.
- Added `npm run db:init` to create the documented collections and indexes in `mmm-db` without seeding fabricated user or wedding records.
- Successful local registration routes to Sign In; successful sign-in routes to the protected owner dashboard. The registration API was verified against Atlas with a temporary QA account that was removed after verification. Local accounts skip email verification only when Resend settings are absent in development.

### Owner planning dashboard and logout — Implemented; route checks passed

- Added a responsive, session-protected owner dashboard with wedding details and live wedding-scoped event, guest, task, and expense totals.
- Added a logout action using the existing logout API, which revokes the hashed session in MongoDB and clears the session cookie. The signed-in logout and dashboard protection were verified in the onboarding flow check.
- The public wedding homepage remains available to signed-out visitors; signed-in users land on the separate dashboard after login.

### Wedding member invitations — Implemented; verification pending

- Added a responsive Members screen based on the Stitch “Members & Collaborators” design, with active members, invite form, pending invitations, and accepted/revoked/expired history. The screen now shares the dashboard header, sign-out action, and full wedding-suite sidebar; Stitch preview controls cover Standard, Empty Pending, Solo Admin Only, Loading, and Recovery Error states without changing stored wedding data. Added a prominent Invite Member action and retry/back-to-overview recovery actions.
- Added wedding membership and invitation models, unique wedding/user membership index, hashed single-use invite tokens, seven-day expiry, Resend delivery status, acceptance, email matching, existing-member handling, and owner/Admin revocation.
- Invitees can sign in or create an account, accept the invite, and open the selected wedding workspace. Owners remain the sole workspace owners; invited Admin/Manager memberships are separate records.
- Updated PRD, system, database, API documents and database initialization for membership roles and invitation lifecycle. Added invitation input schema tests.

## Next milestone

**Next:** Verify Resend sender delivery and end-to-end member invite acceptance/revocation, then continue with multiple wedding workspace list/select/archive management before events and guest management.

## Progress log

| Updated | Milestone | Status | Verification |
|---|---|---|---|
| 2026-11-09 | Initial project scaffold | Complete | TypeScript typecheck passed; all 3 unit tests passed |
| 2026-11-09 | Responsive wedding homepage | Complete | TypeScript typecheck passed; all 3 unit tests passed |
| 2026-11-10 | Homepage planning snapshot | Complete | TypeScript typecheck passed |
| 2026-11-10 | Owner authentication and first wedding setup | Implemented; signup persistence verified | Atlas registration API returned 201 using a temporary QA account; its user and wedding records were removed after verification. Resend is not configured. |
| 2026-11-10 | MongoDB local configuration | Complete | Confirmed the local URI is configured without displaying it; Atlas connectivity was later verified during database initialization. Resend variables remain unset. |
| 2026-11-10 | MongoDB Atlas initialization | Complete | Connected using the configured URI and initialized `mmm-db` with 18 documented collections and indexes. No sample accounts or wedding records were inserted. |
| 2026-11-10 | Authentication flow reliability | Implemented; route smoke checks passed | Addressed the Windows Turbopack junction failure, added local-only verification bypass when Resend is absent, and routes signup to Sign In and successful sign-in to the owner dashboard. |
| 2026-11-11 | Owner planning dashboard and logout | Implemented; route checks passed | Typecheck passed; lint had zero errors and one existing font warning. Public pages and health returned HTTP 200; signed-in logout and protected dashboard behavior were verified in the onboarding flow check. |
| 2026-11-14 | Account signup and first wedding onboarding | Implemented | Signup accepts full name, email, and password only. Authenticated dashboard creates the first wedding workspace and shows couple names, place, date, and an India-time countdown in the same wedding card. Typecheck passed; lint had zero errors and one existing font warning; 7 unit tests passed. HTTP flow verified signup, login, workspace creation, duplicate protection, dashboard details/countdown, logout, and post-logout protection. Temporary QA records were removed. |
| 2026-11-14 | Wedding details setup, editing, and signed-in navigation | Implemented | Added title and description to first-workspace setup and owner-scoped GET/PATCH APIs for editing title, description, partner names, city, date, and tentative-date status. Dashboard branding returns to the public homepage; signed-in homepage CTA opens the dashboard. Description is stored in `wedding_settings`; API/database/product docs and schema tests updated. 9 unit tests passed; typecheck passed; lint passed with one existing custom-font warning; production build passed. Playwright browser flow verified signup validation, registration, invalid/correct login, required setup fields, wedding create/edit/read, ownership isolation, signed-in homepage navigation, logout, and protected dashboard. Temporary QA account and wedding data were removed. |
| 2026-11-14 | Wedding member invitations | Implemented; custom sender domain needed | Added responsive member roster and invitation UI, Admin/Manager role assignment, seven-day hashed single-use invite acceptance, invited email matching, membership duplication checks, expiry/revocation states, and owner/Admin cancellation. Unified dashboard navigation and added all five Stitch preview states, empty-pending display, invite shortcut, and recovery actions. Diagnosed delivery failures: the configured `resend.dev` test sender cannot deliver to arbitrary invitees. The API permits the test sender for the Resend account email; provider recipient restrictions return actionable guidance and failed invitations are revoked for retry. 12 unit tests passed; typecheck passed; lint passed with one existing custom-font warning; production build passed. A verified sender domain and successful real delivery remain pending. |

When a major feature is completed, add a concise row to this log and update the sections above to reflect the current state and next milestone.

### 2026-11-14 ? Resend test sender correction

- Corrected local sender configuration to `onboarding@resend.dev` and removed the blanket test-sender block. Other recipients still require a verified domain.
- Invalid server email configuration now returns a configuration error instead of misleading request validation errors. Provider test-recipient restrictions return actionable guidance.
- Verification: inspected configuration and error handling; no email sent, delivery remains unverified.

### 2026-11-14 ? Signup and invitation handoff

- Removed Resend verification dependency from signup/login; new users are active immediately and legacy pending users can sign in with their password. Suspended users remain blocked.
- Invitation sign-in completes acceptance and opens the existing wedding dashboard, preserving email/token/role checks. Shared sidebar lists owner and members with their roles.
- Existing password recovery and legacy verification endpoints remain available.
- Verification: source review only; no automated/browser tests or emails run in this update.

### 2026-11-14 ? Invitation-specific verification

- Restored verification only for new invited accounts after validating the invitation and matching email. Ordinary signup remains immediately active.
- Verification and resend links retain the invitation; sign-in then accepts it and opens the existing wedding workspace. Members display beneath the owner with their stored Admin/Manager role.
- Pending accounts cannot bypass verification at login. Existing active accounts can reopen their invitation and sign in directly. Failed email delivery leaves a recoverable pending account.
- Verification: source review completed; TypeScript check passed. No live verification email or browser journey performed.

### 2026-11-16 ? Member management and relative invitations

- Added visible Invite Member and Send Invitation actions on overview and members pages. No member seat cap; member invitation history now paginates with full pending/accepted totals.
- Added scoped member removal controls, protecting the owner and self; role storage remains per wedding in invitations/memberships.
- Added separate family/relative guest invitations through Resend with name/email, seven-day hashed acceptance links, pending/accepted counts, revoke, re-invite, and paginated history. Guests accept without signup or dashboard access.
- Matched the existing Stitch Members & Collaborators structure and kept mobile layouts for actions and rows.
- Verification: source review and TypeScript check passed. No live emails, database mutations, or browser tests performed for this increment.
- Next: verify delivery and end-to-end member/guest management, then build guest-event assignments and event-specific RSVPs.

### 2026-11-16 ? Restore member invitation layout

- Restored the Admin/Manager dropdown in the original member invitation form.
- Removed the Bring everyone together cards and Overview invitation actions. Invite Member and Send Invitation remain on the Members page, above the existing forms and status lists.
- Removed the unused action component and its styles. No API or permission changes.
- Verification: source inspection; no browser or automated tests run for this UI adjustment.

### 2026-11-17 ? Review, Manager permissions and responsive verification

- Admins and Managers now share member/guest invitation, status, and revocation controls within their own wedding. Both can remove other Managers; owner/self protection and owner-only Admin removal remain enforced.
- Invitation acceptance and membership creation now commit in one MongoDB transaction; revocation uses a conditional update to prevent accept/revoke races. Acceptance requires a sent invitation.
- Improved tablet form spacing and member rows; kept the Admin/Manager dropdown and invitation actions exclusively on Members.
- Verification: 20 unit tests passed; production build and TypeScript passed; lint has zero errors and one existing custom-font warning. Two Playwright suites passed against the production build: nine public/account pages at 320/390/768/1440px; account signup, invalid/correct login, wedding setup, dashboard widths, invitation email mismatch/acceptance/reuse/expiry/revocation, Manager controls and guest revocation, guest acceptance without dashboard access, removal and session invalidation. Reviewed tablet/mobile screenshots. Temporary QA accounts, weddings, memberships, invitations, guests and sessions were cleaned up.
- Limits: member and guest links were seeded as sent; no live Resend email was sent. Invited-account verification email delivery and password-recovery delivery remain unverified.
- Next: verify live invitation/verification delivery with an approved recipient, then plan the next feature.
