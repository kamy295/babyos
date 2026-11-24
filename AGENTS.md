# BabyOS project instructions

## Architecture

- `src/` contains the React 19, TypeScript, and Vite frontend; `server/src/` contains the Hono backend, with routes, repositories, and shared integrations separated by directory.
- The backend uses Zod for request validation, Supabase's JavaScript client for PostgreSQL, and `@google/genai` for Gemini integration. Vite proxies `/api` to `localhost:3000`.
- Migrations in `supabase/migrations/` define the database schema and functions. Tables include families, family members, babies, family notes, baby events, and tasks.
- For interval events, `baby_events.event_date` remains the event/start date; nullable `end_date` stores an explicit end calendar date when available. Preserve nulls for legacy records unless their end dates are supported by evidence.
- Repositories scope development data using `BABYOS_DEV_FAMILY_ID` and `BABYOS_DEV_BABY_ID`. The backend also reads `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `GEMINI_API_KEY`; `PORT` defaults to 3000. Keep credentials private.
- Follow source and migrations when checking current behavior; README feature and persistence notes may lag. Do not assume authentication or production authorization; inspect actual routes, grants, and policies.

## Commands

- `npm run dev` — frontend; `npm run dev:server` — backend.
- `npm test` — Vitest; `npm run lint` — ESLint; `npm run build` — tests, lint, root TypeScript build, and Vite production build.
- The server has a separate `server/tsconfig.json`; check it with `npx tsc --noEmit -p server/tsconfig.json` when backend type checking is needed.

## Durable project guidance

- Update this file when significant architectural decisions change. Keep task-specific procedures in the relevant `.agents/skills/` workflow.
- Preserve existing user changes. Do not apply migrations to a live database, commit, push, or deploy unless explicitly requested.
