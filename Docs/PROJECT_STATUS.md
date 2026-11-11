# Make My Marriage — Project Status

**Last updated:** 2026-11-11

This file tracks major project milestones. Detailed requirements and architecture remain in `PRD.md`, `System_Design.md`, `DB_Design.md`, and `API_Design.md`.

## Current status

The initial project foundation, responsive public homepage, owner authentication/onboarding flow, and private owner dashboard are implemented. The app targets `mmm-db` by default. Atlas connectivity was verified during initialization, and the database contains all 18 documented collections and their indexes. The dashboard is protected by the owner session, reads wedding-scoped summary counts, and provides logout that revokes the server session and clears its cookie. Local development can register and sign in without Resend; production still requires email verification. Wedding workspace management beyond the initial workspace, guest RSVPs, and photo uploads are not implemented yet.

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

### Owner authentication and first wedding setup — Implemented; signup persistence verified

- Added responsive Stitch-based sign-in and sign-up screens, email verification, resend verification, password recovery, and reset screens.
- Added versioned auth API routes for registration, login, logout, current user, verification, and password recovery. Registration creates the owner's initial draft wedding workspace.
- Passwords use Argon2id; session and verification/reset tokens are stored as hashes; auth attempts are rate limited.
- Atlas connectivity was verified using the configured `MONGODB_URI`; `mmm-db` was initialized with the documented collections and indexes. The URI is not printed or committed. `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are required for production email verification.
- The local development server uses Webpack because Turbopack failed to create package junctions on this Windows setup. MongoDB connection failures now return a structured 503 response instead of an unhandled 500.
- Added `npm run db:init` to create the documented collections and indexes in `mmm-db` without seeding fabricated user or wedding records.
- Successful local registration routes to Sign In; successful sign-in routes to the protected owner dashboard. The registration API was verified against Atlas with a temporary QA account that was removed after verification. Local accounts skip email verification only when Resend settings are absent in development.

### Owner planning dashboard and logout — Implemented; route checks passed

- Added a responsive, session-protected owner dashboard with the initial wedding workspace and live wedding-scoped event, guest, task, and expense totals.
- Added a logout action using the existing logout API, which revokes the hashed session in MongoDB and clears the session cookie. The logout flow is implemented but still needs a signed-in end-to-end check.
- The public wedding homepage remains available to signed-out visitors; signed-in users land on the separate dashboard after login.

## Next milestone

**PRD Phase 1:** Verify sign-in and logout with a signed-in owner account, configure Resend for production email verification, then implement wedding workspace list/select/update and authorization.

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
| 2026-11-11 | Owner planning dashboard and logout | Implemented; route checks passed | Typecheck passed; lint had zero errors and one existing font warning. Public pages and health returned HTTP 200; unauthenticated `/dashboard` redirected to Sign In. Full signed-in logout flow remains to be checked. |

When a major feature is completed, add a concise row to this log and update the sections above to reflect the current state and next milestone.
