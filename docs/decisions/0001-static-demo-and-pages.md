# ADR 0001: Static Pages app with an explicit demo boundary

Date: 2026-10-16  
Status: Accepted for P0/P1

## Context

The first build must run without keys and stay on GitHub Pages. The eventual product is private, but Pages serves static browser artifacts and cannot hold service secrets or run an authenticated backend.

## Decision

Use a pnpm workspace with React 19/TypeScript/Vite, shared pure domain rules and bundled public demo fixtures. Use HashRouter and a deployment-computed Vite base path. Deploy `apps/web/dist` through GitHub Actions only after lint, typecheck, tests and build. Keep Auth, RLS, private business persistence, Edge Functions and Cron reserved for a separately authorised P2 implementation.

## Consequences

P0/P1 is useful for reviewing evidence and financial scenarios, but its login shell is not access control and its data is public. No private research or credential is accepted as a deployment prerequisite. No Supabase deployment workflow is created prematurely. GitHub plan/organisation restrictions may block Pages; report them and obtain an explicit hosting choice rather than changing platform silently.

