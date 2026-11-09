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

Playwright is configured for Chromium. Install browser binaries when needed with `npx.cmd playwright install chromium`.

## Structure

- `Docs/` — project status plus product, architecture, database, and API specifications
- `src/app/` — App Router pages and versioned API routes
- `src/lib/` — database, environment, HTTP, and shared utility foundations
- `tests/unit/` — example unit test; `tests/e2e/` is the configured Playwright location

Feature-specific modules, components, and supporting directories can be added with their implementation phases.

The existing specification files are `Docs/PRD.md`, `Docs/System_Design.md`, `Docs/DB_Design.md`, and `Docs/API_Design.md`.

## Current limits and next phase

The scaffold includes the landing page, health endpoint, environment validation helpers, and a lazy MongoDB connection utility. It does not implement authentication, wedding or guest management, RSVPs, email workflows, expenses, vendor discovery, gallery uploads, or dashboard business logic. The recommended next phase is **Phase 1 from the PRD**: authentication, session lifecycle, owner authorization, wedding workspace CRUD, and database models/indexes.
