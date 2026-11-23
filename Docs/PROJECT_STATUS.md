# Make My Marriage — Project Status

**Last updated:** 2026-11-23

This file tracks major project milestones. Detailed requirements and architecture remain in `PRD.md`, `System_Design.md`, `DB_Design.md`, and `API_Design.md`.

## Current status

The public wedding website is implemented at a shareable wedding slug. Owners, Admins, and Managers can publish or unpublish it, select a visual theme, and optionally show a livestream link. Publishing the website now makes all non-cancelled events and all wedding gallery photos visible, including events still marked Draft; cancelled events stay private. The hero prefers the Engagement event's assigned photo and falls back to the latest uploaded gallery photo. The heirloom chronicle shows a card for each event with its own latest assigned photo, date/time, venue, and short description; remaining uploaded photos appear in the additional memories lightbox. The active wedding-wide guest QR is rendered server-side from the same dashboard link. Public queries omit guest lists, invitations, tasks, expenses, vendors, private event notes, and internal IDs. TypeScript, lint, unit tests, production route smoke checks, and the live published wedding endpoint were verified; lint reports only `<img>` optimization warnings. A production build was not run because the active dev server owns `.next` on this Windows environment.

Guest QR is available in the dashboard. Owners, Admins and Managers can share one 30-day QR code for the wedding and upload or delete gallery photos. Guests choose the event when uploading. Guests can upload and download shared photos without an account. Authenticated gallery uploads verify that the selected event is active and belongs to the same wedding.

Wedding Gallery is now available from the dashboard with the supplied responsive empty state, responsive image masonry layout, and a drag-and-drop style upload dialog. Owners, Admins, and Managers can upload up to 20 JPEG, PNG, or WebP images per batch, up to 10 MB each, and optionally attach them to an existing wedding event. Uploads are signed server-side and stored in the configured Cloudinary account; MongoDB keeps only wedding-scoped photo metadata. TypeScript verification passed; browser upload verification remains next.

Organizers can create and share one wedding RSVP link before adding events. Each household opens the invitation without signing in, enters its name, accepts or declines, and supplies its own headcount if attending. A successful submission now redirects to a unique private household link for later updates; reopening the original shared link starts a new household response. The guest directory and dashboard totals reflect saved responses. Targeted RSVP tests and TypeScript checks passed. Live browser and database verification is pending.

The shared RSVP form now collects an optional mobile number alongside the guest or family name. It validates and saves with the household response and is available from that household's private update link. Browser-based verification remains pending because the local browser-control connection was unavailable.

Personal event invitations and RSVP are implemented from the supplied references: accountless guest links, copy/preview/WhatsApp sharing, token rotation/revocation, assigned itinerary, RSVP confirmation/update, party limits, deadlines, and transactional event-capacity checks. Guest saves update their page immediately; visible team dashboards and guest lists refresh automatically about every five seconds. Invitations & RSVP now has live response totals. Build/static checks passed; end-to-end browser/database and email verification for this increment remains pending.

Wedding Guests is implemented from the supplied references: responsive empty/list screens, guest search and event/RSVP filters, separate add/details/edit pages, contact/family details, maximum party size, event checkboxes, private notes, and confirmed removal. Guest/assignment writes are transactional and wedding-scoped. Saving a guest does not send email; existing Members invitations reuse matching guest records. TypeScript and production build passed; lint has no errors and one existing font warning. Live guest browser/database verification remains pending.

Wedding Tasks is implemented with a responsive reference-based empty/list page, separate add/details pages, reusable form and workspace components, member/event assignments, filters, tab counts, overdue/completed indicators, status updates, and delete confirmation. APIs persist tasks in MongoDB with wedding isolation and stale-edit protection. Build/static checks passed; task browser/database flow verification is pending.

Wedding Events is now implemented: responsive itinerary list and reference-based add/edit form, private APIs and MongoDB persistence, optional end time, venue/address/dress code, planning settings, cancellation/removal, and live dashboard event counts. Owners, Admins, and Managers have wedding-scoped event access. Build/static checks passed; event-specific browser/database flow verification is pending.

The dashboard and Members page share a responsive workspace shell inspired by the approved reference: stationary desktop navigation, independently scrolling content, and a compact menu on mobile/tablet and short screens. Existing colors, fonts, and shared branding are preserved; future navigation sections are labelled Soon.

All page headers and the homepage footer now use the shared guest-homepage logo component, with consistent responsive styling.

The initial project foundation, responsive public homepage, owner authentication, first-workspace onboarding, editable wedding details, private dashboard, and first increment of wedding member invitations are implemented. Owners, Admins, and Managers can invite users as Admin or Manager through the configured Resend integration; invitations use single-use hashed tokens, seven-day expiry, invited email matching, accept/revoke flows, member visibility, and a selected-workspace landing after acceptance. Live Resend delivery has not been reverified in this review; the shared `resend.dev` testing sender only permits the Resend account recipient, while arbitrary recipients require a verified domain. Managers have the same invitation permissions as Admins. Role changes are deferred; owners can now remove Admin/Manager members and Admins and Managers can remove other Managers. Sign-up collects only the account name, email, and password; after sign-in, the owner can add and edit wedding details on the dashboard. The app targets `mmm-db` by default. The database initialization script now provisions 20 documented collections and their indexes. Local development can register and sign in without Resend; ordinary signup/login work without email verification; new accounts created through invitations must verify their email before signing in. Accountless guest invitations and event RSVPs are implemented. Photo uploads are pending.

## Completed milestones

### 2026-11-23 — Public wedding itinerary, images, and QR rendering

- Rendered the active wedding guest QR on the server using the exact current dashboard link, avoiding a blank QR while browser JavaScript initializes.
- Prefer the published Engagement event's assigned gallery photo in the hero. Each event row displays only its own latest assigned image, never a generic photo repeated across unrelated events.
- Show the gallery section when event-assigned photos are public, while unassigned wedding photos remain hidden unless gallery visibility is enabled. Removed duplicate management links from the website settings content; existing dashboard navigation remains the control surface.
- Verification: TypeScript passed; lint completed without errors and with image-element optimization warnings. Production build was blocked by an `.next` directory lock/permission error; live database/browser verification was unavailable.

### 2026-11-23 — Wedding chronicle gallery content correction

- Removed the separate gallery-visibility checkbox from website settings; publishing the wedding website now exposes gallery photos and all non-cancelled events, including draft events. Cancelled events remain excluded.
- Replaced the empty visual-chronicle-only photo grid with event cards showing one latest event-assigned image, date, time, venue, and a short description. Additional uploaded images remain accessible in a lightbox. The hero prefers the Engagement photo and falls back to the latest gallery photo.
- Kept event, gallery, and guest QR controls in the existing dashboard navigation; removed duplicate controls from the website settings content.
- Verification: TypeScript passed; targeted lint has no errors and reports image optimization warnings. Production build and live database/browser verification remain pending.

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

Verify the guest QR and public wedding website with a phone against a reachable Vercel deployment. Confirm the production URL, publish/unpublish behavior, event visibility, gallery opt-in, and public/private data boundaries.

**Next:** Share one wedding link with two independent browsers. Confirm one household attending, decline for the other, then revise the first response and verify the saved names, counts, and dashboard totals. For personal event invitations, verify automatic dashboard updates, capacity/deadline limits, expired/revoked links, cross-guest isolation, and responsive layouts. Confirm the deployment URL before sharing links externally. Verify Guests create/edit/delete, event selection, party limits, filters, invitation compatibility, and mobile/tablet layouts against the database. Verify Tasks create/edit/status/delete, filtering, member/event assignment isolation, timezone boundaries, and responsive browser flows, alongside the pending Events checks. Verify live Resend invitation and invited-account verification delivery with an approved recipient. Existing seeded member/guest acceptance, revocation, permissions, and responsive browser flows are verified. Confirm the next feature plan before starting implementation.

## Progress log`r`n`r`n### 2026-11-23 — Manual review and route smoke verification`r`n`r`n- Verified the homepage and published wedding website, public wedding JSON, public event JSON, dashboard website settings, and guest QR route response against the running local app; public data returned four events and four event/gallery images, plus the active guest QR.`r`n- Reviewed the uncommitted public website, gallery, and guest QR changes. Fixed authenticated photo uploads to reject events outside the current wedding or events that are deleted/cancelled.`r`n- Verification: 32 unit tests passed; TypeScript and lint passed (12 image/font warnings); `git diff --check` passed. Production build was not run while the active dev server held the `.next` directory lock. Phone scanning requires a deployed/reachable URL.

### 2026-11-22 — Public wedding site sections and guest photo sharing

- Kept the celebrations section visible with a useful empty state when no events are published; draft events remain private. Added an admin shortcut to manage/publish events.
- Added event calendar downloads, responsive gallery browsing with a keyboard-enabled lightbox, and a wedding-wide QR/share section on the public website.
- Added the public, no-account photo page and wedding-scoped upload API. Guests can optionally choose a published event; guest contributions are distinguished from organizer uploads in photo metadata.
- Updated API/database docs. Verification: `npm run typecheck` passed; targeted ESLint passed with only existing `<img>` optimization warnings. Browser, Cloudinary, and Vercel QR checks remain pending.

### 2026-11-22 — Public website themes, motion, and current guest QR

- Added scroll-aware section entrance and gentle hover motion with reduced-motion support. Redesigned theme variables so Elegant Royal, Minimal Modern, and Traditional Indian produce visibly different site palettes consistent with the public homepage.
- The public site now renders the same active guest QR URL shown in the Guest QR dashboard. QR generation remains hashed at rest; server-side HMAC derivation uses a random generation nonce, and regeneration/revocation/expiry are respected.
- Uses real Cloudinary photos assigned to published events for the hero/event cards; general gallery photos remain opt-in. Verification: typecheck and Webpack production build passed; targeted ESLint passed with only `<img>` optimization warnings. Browser interaction and live QR rotation/revocation checks remain pending.

### 2026-11-22 — Data-driven public wedding website redesign

- Rebuilt the public page to follow the public homepage’s visual language while keeping the root homepage unchanged. The split hero, date/city facts, countdown, celebration timeline, event images, venue map links, dress codes, calendar downloads, visual gallery, and guest QR now use the selected wedding’s own data.
- Public event rows are sourced only from PUBLISHED, non-deleted events. Photos attached to those public events can illustrate the itinerary; unassigned gallery photos remain governed by the gallery visibility setting. No sample couple, location, or ceremony text is shown.
- Verification: typecheck and Webpack production build passed. Targeted ESLint passed with image optimization warnings; browser verification remains pending.

### 2026-11-22 — Public wedding website

Added authenticated website settings for publication state, theme, livestream URL, and gallery visibility, plus a responsive public page at `/wedding/{slug}`. The public page and REST responses include only approved wedding details, published events, and opted-in gallery photos. Event-linked uploads appear on their event cards, with an uploaded gallery image as the visual fallback. Draft/cancelled events and private notes are excluded. TypeScript verification passed. Browser and deployment checks remain pending.

### 2026-11-22 — Wedding-wide guest QR

Moved event selection to the guest upload page, added wedding-scoped event validation and granted Admins and Managers equal gallery and QR permissions. Existing album links retain their original scope. TypeScript and guest gallery/form tests cover the change; live phone and Cloudinary verification is pending.

### 2026-11-22 — Guest QR photo albums

Added event-scoped guest upload and download, owner-only deletion with in-app confirmation, and expiring hashed access tokens. TypeScript and four gallery validation tests passed. Local HTTP checks confirmed the dashboard sign-in redirect and a 404 for an invalid guest link. Live photo transfer and phone scanning remain unverified.

### 2026-11-21 - Personal invitations and automatic RSVP updates

- Added the no-login personal invitation page with shared branding, couple/photo hero, assigned itinerary, Formal RSVP, attendance counts, confirmation, and update response. Supports shared or individual event responses, deadlines, empty/unavailable states, and responsive layouts.
- Added share-link creation/copy/preview/WhatsApp sharing, regeneration/revocation, hashed-token expiry, and public guest-token APIs. RSVP batches save transactionally with assignment, party-size, deadline, and event-capacity checks. Updated existing email invitations to include the RSVP link while retaining receipt acknowledgement.
- Enabled Invitations & RSVP navigation and response totals. Guest saves reflect immediately; team pages auto-refresh about every five seconds, and other guest views every fifteen seconds outside editing. Preserved private guest/contact/notes isolation. Updated specifications and OpenAPI.
- Verification: production build and TypeScript passed; lint passed with zero errors and the existing layout font warning. No automated tests, manual browser/database scenarios, or live emails were run for this increment.

### 2026-11-19 - Wedding Guests implementation

- Enabled Guest list in the shared sidebar. Built the reference-based empty state, desktop table/mobile cards, search/event/RSVP filtering, pagination, and separate add/details/edit form with three sections and planning summary. Reused planning components and kept existing branding and dashboard navigation.
- Added private guest CRUD APIs, shared guest model, Zod validation, same-wedding event assignments, transaction-based writes, duplicate-email handling, stale-edit protection, archived read-only access, and soft deletion that invalidates invitation links. Preserved existing Members guest invitation delivery; saving a guest does not send email.
- Added actual per-event RSVP summaries without treating invitation acceptance as attendance. Guest deletion retains response history; edits protect responded assignments and confirmed party sizes. Public RSVP submission remains future work. Updated API/database/product/system documentation and openapi/guests.json.
- Verification: npm run typecheck and npm run build passed. npm run lint passed with zero errors and one pre-existing layout font warning. No automated tests or manual browser/database scenarios were run for this increment.

### 2026-11-19 - Wedding Tasks implementation

- Enabled Tasks beside Events, added event-to-task links, and connected the dashboard pending-task total. Built the reference-based empty/list page, All Tasks/My Tasks/Completed tabs, filters, row status updates, details/editing, deletion confirmation, and a separate add form that returns to the list after saving.
- Added reusable planning form sections/fields/headings and workspace layout/context; Events and Tasks now share server authorization and cookie/origin request checks. Task inputs support member assignment, event links, due date, priority/status, description, category, and notes. Completion and overdue calculations follow the documented rules; archived weddings are read-only.
- Added five private task API handlers, a MongoDB task model/service, relationship checks, soft deletion, pagination/counts, and stale-update protection. Updated API/database/system/product docs, Tasks OpenAPI, and database initialization indexes. No emails or sample task records were created.
- Verification: TypeScript and production build passed; lint passed with zero errors and the existing custom-font warning. No automated tests, manual browser flow, or database write checks were run for this increment. Development server restarted for review.

### 2026-11-18 - Wedding Events implementation

- Enabled Events navigation and added a chronological, paginated itinerary with empty state and create/edit/cancel/delete actions. The responsive three-section form follows the supplied references, preserving the shared header/sidebar, logo, colors, and typography. It includes name/type/description, wedding-local start/end, venue/address/dress code, and optional status/capacity/deadline/private notes.
- Added server-only events model/service and five private REST handlers with Zod validation, session/origin checks, Owner/Admin/Manager authorization, wedding isolation, archived-workspace protection, and stale-edit detection. Removal is a soft delete; dashboard planned-event totals exclude deleted/cancelled events. No invitation email is sent.
- Updated API, database, product, and system documents plus the Events OpenAPI contract. No new database collection or dependency was required.
- Verification: production build and TypeScript passed; lint reported zero errors and the existing custom-font warning. Event-specific unit, database, and browser flows were not run in this increment; responsive layout is implemented but requires browser verification. Development server restarted on port 3000. No real events or QA records were created.

### 2026-11-18 - Dashboard layout and responsive navigation

- Reworked the dashboard around the supplied reference with grouped sidebar navigation, a workspace name card, a larger wedding summary, and a wrapping planning-team row. The countdown remains directly below the couple names within the same card. Existing live statistics and Members controls are preserved; unfinished sections are marked Soon without fabricated sample content.
- Desktop sidebar stays stationary while the right panel scrolls. Narrow and short viewports use a collapsible menu; reduced mobile padding, wrapping content, and 16px form controls address overflow and input-focus zoom.
- Verification: TypeScript and production build passed; lint passed with one existing custom-font warning. Both production Playwright suites passed, covering authentication, wedding setup, member/guest flows, logout, responsive layouts at 320/390/768/1440px, menu controls, content overflow, and stationary desktop navigation. Reviewed desktop and 320px dashboard screenshots. Temporary QA records were removed by the suite. No live email was sent.
- Next: review the refreshed dashboard, verify live Resend delivery with an approved recipient, then confirm the next feature.

| Updated    | Milestone                                                | Status                                   | Verification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | -------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-09 | Initial project scaffold                                 | Complete                                 | TypeScript typecheck passed; all 3 unit tests passed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-11-09 | Responsive wedding homepage                              | Complete                                 | TypeScript typecheck passed; all 3 unit tests passed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-11-10 | Homepage planning snapshot                               | Complete                                 | TypeScript typecheck passed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-11-10 | Owner authentication and first wedding setup             | Implemented; signup persistence verified | Atlas registration API returned 201 using a temporary QA account; its user and wedding records were removed after verification. Resend is not configured.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-11-10 | MongoDB local configuration                              | Complete                                 | Confirmed the local URI is configured without displaying it; Atlas connectivity was later verified during database initialization. Resend variables remain unset.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-11-10 | MongoDB Atlas initialization                             | Complete                                 | Connected using the configured URI and initialized `mmm-db` with 18 documented collections and indexes. No sample accounts or wedding records were inserted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-11-10 | Authentication flow reliability                          | Implemented; route smoke checks passed   | Addressed the Windows Turbopack junction failure, added local-only verification bypass when Resend is absent, and routes signup to Sign In and successful sign-in to the owner dashboard.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-11-11 | Owner planning dashboard and logout                      | Implemented; route checks passed         | Typecheck passed; lint had zero errors and one existing font warning. Public pages and health returned HTTP 200; signed-in logout and protected dashboard behavior were verified in the onboarding flow check.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-11-14 | Account signup and first wedding onboarding              | Implemented                              | Signup accepts full name, email, and password only. Authenticated dashboard creates the first wedding workspace and shows couple names, place, date, and an India-time countdown in the same wedding card. Typecheck passed; lint had zero errors and one existing font warning; 7 unit tests passed. HTTP flow verified signup, login, workspace creation, duplicate protection, dashboard details/countdown, logout, and post-logout protection. Temporary QA records were removed.                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-11-14 | Wedding details setup, editing, and signed-in navigation | Implemented                              | Added title and description to first-workspace setup and owner-scoped GET/PATCH APIs for editing title, description, partner names, city, date, and tentative-date status. Dashboard branding returns to the public homepage; signed-in homepage CTA opens the dashboard. Description is stored in `wedding_settings`; API/database/product docs and schema tests updated. 9 unit tests passed; typecheck passed; lint passed with one existing custom-font warning; production build passed. Playwright browser flow verified signup validation, registration, invalid/correct login, required setup fields, wedding create/edit/read, ownership isolation, signed-in homepage navigation, logout, and protected dashboard. Temporary QA account and wedding data were removed.                                                                                |
| 2026-11-14 | Wedding member invitations                               | Implemented; custom sender domain needed | Added responsive member roster and invitation UI, Admin/Manager role assignment, seven-day hashed single-use invite acceptance, invited email matching, membership duplication checks, expiry/revocation states, and owner/Admin cancellation. Unified dashboard navigation and added all five Stitch preview states, empty-pending display, invite shortcut, and recovery actions. Diagnosed delivery failures: the configured `resend.dev` test sender cannot deliver to arbitrary invitees. The API permits the test sender for the Resend account email; provider recipient restrictions return actionable guidance and failed invitations are revoked for retry. 12 unit tests passed; typecheck passed; lint passed with one existing custom-font warning; production build passed. A verified sender domain and successful real delivery remain pending. |

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

### 2026-11-17 - Follow-up regression review

- Working tree was clean at the start; the feature changes were already committed and pushed as `d18cc41`. Rechecked invitation authorization, wedding isolation, hashed tokens, membership constraints, and Members page controls; no new issues identified in the reviewed areas.
- Fresh verification: production build (including TypeScript) passed; 20 unit tests passed; lint passed with the existing custom-font warning; both production Playwright suites passed (37.5 seconds). The suite covers responsive public/account pages, signup/login, wedding setup, member/guest invitation acceptance and revocation, expiry, Manager access, removal, and logout/session invalidation. Temporary QA records were cleaned up by the suite.
- Visually inspected fresh desktop and mobile Members screenshots. Native manual browser control was unavailable because the computer-use connection could not be opened; this was automated browser testing plus screenshot review, not a completed manual interaction pass.
- No live email sent. Resend delivery, invited signup email verification delivery, and password-recovery delivery remain unverified. Only this progress record changed in the follow-up.

### 2026-11-17 - Consistent site logo

- Extracted the guest homepage heart icon, Make My Marriage wordmark, and An Heirloom Chronicle tagline into one shared SiteLogo component. Homepage header/footer, dashboard and Members sidebar, signup/login/recovery/verification headers, and member/guest invitation pages now use it. All logos link to the public homepage.
- Shared responsive sizing follows the homepage styling, including hiding the tagline on narrow phones. Removed obsolete page-specific logo styles.
- Verification: source inspection only; no automated tests or browser checks run for this UI change.

### 2026-11-21 — Shared household invitations and RSVP submission fix

- Simplified Invitations & RSVP to one Create link action. Households respond on the invitation itself and choose their own attendance count.
- Added an optional mobile-number field to the shared RSVP form. It is validated and saved with the household response.
- Fixed the Zod schema crash that caused RSVP submission to return an internal-server error. A successful submission now creates a private household RSVP link, redirects the respondent to it, and clears the common-link browser key so the shared link can collect the next household's response.
- Private household links are token-hash protected, expire or revoke with their shared invitation, and allow only that household to reopen or update its response.
- Verification: all 26 unit tests, TypeScript checking, formatting checks, and lint passed. Lint retains one existing custom-font warning in `src/app/layout.tsx`. Browser-based RSVP verification remains pending because the local browser-control connection was unavailable.
