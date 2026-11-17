# Make My Marriage

Make My Marriage is a multi-wedding planning application. It helps a wedding owner organize events, guests, invitations, RSVPs, tasks, actual expenses, vendors, a public wedding website, and photo albums. Guests use invitation links and do not need platform accounts.

This repository contains the initial application scaffold. Business features are intentionally not implemented yet.

## Technology

- Next.js App Router, React, and TypeScript
- Next.js Route Handlers with REST JSON at `/api/v1`
- Tailwind CSS
- MongoDB Atlas with Mongoose and Zod validation
- Argon2id and secure cookie-based sessions (foundation only)
- Resend, Cloudflare R2, and Google Places integration foundations
- Vitest, React Testing Library, Playwright, ESLint, and Prettier

## Prerequisites

- Node.js 22 (see `.nvmrc`)
- npm 10 or a compatible newer npm release

## Install and configure

```powershell
npm.cmd install
if (!(Test-Path .env.local)) { Copy-Item .env.example .env.local }
```

This workspace has a local `.env.local` with randomly generated development secrets. On a fresh checkout, create it from the example only if it does not already exist, then set independent random values for `SESSION_SECRET`, `TOKEN_HASH_SECRET`, and `RATE_LIMIT_SECRET`. Keep the file private and never commit it. Add provider credentials only when implementing and using the matching integration. External credentials are not required to build or run the initial app.

## Local development

```powershell
npm.cmd run dev
```

Open [http://localhost:3000](http://localhost:3000). The application availability endpoint is `GET /api/v1/health`; it does not test provider or database connectivity.

## Checks

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
```

Playwright is configured for Chromium. Install browser binaries with `npx.cmd playwright install chromium`. Public-page layout tests run by default. Database flow tests require explicit opt-in (`$env:RUN_DB_E2E="1"`) and use temporary QA accounts and seeded invitations, removed in a finally block. No email is sent. For stable production testing, first run `npm.cmd run build`, set `$env:E2E_PRODUCTION="1"`, and run `npm.cmd run test:e2e -- --workers=1` with port 3000 available.

## Structure

- `Docs/` — project status plus product, architecture, database, and API specifications
- `src/app/` — App Router pages and versioned API routes
- `src/lib/` — database, environment, HTTP, and shared utility foundations
- `tests/unit/` — example unit test; `tests/e2e/` is the configured Playwright location

Feature-specific modules, components, and supporting directories can be added with their implementation phases.

The existing specification files are `Docs/PRD.md`, `Docs/System_Design.md`, `Docs/DB_Design.md`, and `Docs/API_Design.md`.

## Current limits and next phase

The public homepage, account authentication, wedding setup/editing, dashboard, member invitations/removal, and accountless guest invitations are implemented. Admins and Managers can manage member and guest invitations within their wedding. Owner-only wedding editing and protected member-removal rules remain enforced. Live email delivery requires Resend configuration and a verified sender domain for arbitrary recipients; it is not covered by the seeded browser suite. Events, event-specific RSVPs, expenses, and photo uploads remain future milestones. See `Docs/PROJECT_STATUS.md` for verified progress.
