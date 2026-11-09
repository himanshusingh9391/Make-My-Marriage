# Project instructions

- Read `Docs/PRD.md`, `Docs/System_Design.md`, `Docs/DB_Design.md`, and `Docs/API_Design.md` before implementing features. These are the current specification files; preserve their names and contents.
- Follow the approved modular-monolith architecture using Next.js App Router, Route Handlers, and REST JSON under `/api/v1`.
- Use TypeScript strict mode and avoid `any`.
- Validate API input with Zod. Keep business logic out of Route Handlers and React components.
- Keep MongoDB access in server-side modules. Never connect to MongoDB from browser code.
- Enforce wedding ownership and `weddingId` isolation on every private operation and query.
- Store session and invitation tokens as hashes. Use secure cookie-based sessions.
- Validate guest-event assignments for every RSVP operation.
- Follow the documented API response envelope and update API/database documentation when contracts change.
- Write tests for new functionality and avoid unnecessary dependencies.
- Maintain `Docs/PROJECT_STATUS.md` as the project progress log. When a major feature is completed, add a dated entry with a concise summary and verification performed, then update the current status and next milestone. Keep it focused on progress; the specification documents remain the source of detailed requirements and design.
- Ask before significant architecture or product-scope changes. Never silently remove existing requirements.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
