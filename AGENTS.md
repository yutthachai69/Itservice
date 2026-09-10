# itservice-app — agent notes

IT Service **ticket system** rebuild of the legacy ASP.NET Web Forms site
`itservice.tsmgroup.local`. See `../SPEC.md` and `../PLAN.md` for the full spec.

## Stack
- Next.js 16 (App Router, TS, Turbopack) — full-stack, API via Route Handlers
- Prisma 6 → **SQL Server** (default instance `localhost:1433`, Windows integrated auth)
- Tailwind v4, fonts Kanit/Itim
- Auth: **Entra ID (Azure AD) OIDC + Microsoft Graph** — `src/lib/entra.ts` +
  `/api/auth/{login,callback,logout}`, JIT-provisions `User` from Graph `/me`
  (`src/lib/auth.ts:provisionFromGraph`, site mapping in `src/lib/directory.ts`).
  `AUTH_MODE=mock` in `.env` short-circuits it (canned profile + dev user picker);
  set real `ENTRA_*` and `AUTH_MODE=entra` to go live. Session = cookie `uid`.

## This workstation is busy (SQL Server + Postgres + Docker also run here)
- **Do NOT run `npm run build` casually** — it was freezing the machine (17 workers).
  `next.config.ts` now caps workers at 2, but still prefer:
- `npx tsc --noEmit` for type checks (light)
- `npm run dev` only when testing in a browser; stop it when done
- Port 3000 is taken by another app; dev falls back to 3001

## DB
- `npx prisma migrate dev --name <x>` — schema change
- `npm run db:seed` — sites (01-06), sample departments, approvers, 4 demo users
  (`user.demo` / `it.staff` / `it.lead` / `admin`)
- `npm run db:reset` — drop + migrate + seed

## Layout
- `src/lib/form-defs.ts` — the 5 v1 forms (F06/F07/F10/F11/F12); drives the
  renderer, validation, detail view, print
- `src/lib/tickets.ts` — validation, `createTicket`, `applyTransition`, `actOnApproval`
- `src/lib/docno.ts` — doc no `YYMMNNN` (Buddhist year), counter table
- `src/app/(app)/` — authed pages (home, tickets list/new/detail/print, evaluate)
- `src/app/api/` — tickets CRUD, transition, approve, evaluate, departments, export

## Status (v1) — engine feature-complete
Done: forms, create, doc-no, list+filter+search+Excel export, workflow
(RECEIVE/ASSIGN/PROGRESS/RESOLVE + requester CONFIRM_CLOSE/REJECT_RESOLVE / CLOSE
/CANCEL/REOPEN/COMMENT/EDIT), F07/F10 approval gating, business-hours SLA badge
(`src/lib/business-hours.ts`), attachments (`src/lib/uploads.ts`, local `uploads/`),
email notifications (`src/lib/mailer.ts` + `notify.ts`, MAIL_TRANSPORT=log|smtp),
role synced from Entra department each login (`roleLocked` to pin), evaluation, print.
Next: real Entra creds, F01 asset registry, F02/F03, permission-admin UI,
dashboard/eval report, holiday calendar, IT lead-review-before-close, data migration.
