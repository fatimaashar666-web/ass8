# Campus Fix

Campus Fix is a Next.js App Router application for reporting and managing campus technology and facilities issues.

## Stack and structure

- Next.js App Router, React, and strict TypeScript.
- PostgreSQL is accessed through Prisma. The schema lives in `prisma/schema.prisma`.
- Application TypeScript types live in `src/types/`; global CSS lives in `src/styles/` and is imported by `src/app/globals.css`.
- API Route Handlers live under `src/app/api/`. Keep database access on the server.
- The UI is intentionally dark with bright category and status colors. Preserve the existing responsive visual system.

## Local setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `ADMIN_PASSWORD`, and a long random `SESSION_SECRET`.
2. Create a PostgreSQL database matching the URL.
3. Run `npm install`, `npm run db:generate`, and `npm run db:migrate`.
4. Start the app with `npm run dev`.

Use `npm run lint`, `npm run typecheck`, and `npm run build` to validate changes.

## Product behavior

- Visitors can submit a report and track its status using the returned `ISS-...` reference.
- Only an authenticated admin may list reports or change their status. The session is an eight-hour, HTTP-only, same-site cookie signed with `SESSION_SECRET`.
- Anonymous overview statistics contain aggregate counts only. Do not expose reporter details or image attachments through public endpoints.
- Categories are Computer, Projector, Fan, Light, and Wi-Fi. Statuses are Pending, In Progress, and Resolved.
- Attachments are client-compressed JPEG data stored with the issue. Keep server-side image validation and size limits in sync with client compression.

## Implementation notes

- Keep all reporter data and database credentials server-side except where the signed-in admin interface needs them.
- Validate and constrain all incoming values in Route Handlers; never trust client validation alone.
- Do not change complaint categories or statuses without updating the Prisma schema, `src/types/issue.ts`, API validation, and the UI labels together.