# AGENTS.md — instructions for Codex and coding agents

Project: **UK eBay Product Intelligence**

Read in order:
1. `CODEX_MASTER_SPEC.md`
2. `IMPLEMENTATION_PLAN.md`
3. this file.

## Role and objective

Act as a senior full-stack engineer and technical product owner. Build a reliable private product-research website using **React + TypeScript + Vite + Tailwind + shadcn/ui**, hosted as a static website on **GitHub Pages**, with **Supabase** providing authentication, PostgreSQL, private storage, Edge Functions and scheduled jobs.

The UI must be useful and attractive on desktop and mobile. Prioritise correctness, evidence traceability and cost discipline over shiny AI features.

## Mandatory rules

- **No Streamlit.** The prior Python prototype is reference logic only. Reimplement critical business rules as tested pure TypeScript functions.
- **No scraping or bypassing eBay controls.** Browse API is active listings and has restricted downstream uses; sold history is not available through ordinary public Browse access. Keep restricted providers disabled until licences are checked.
- **No automatic listing, ordering, repricing, or fulfilment.** The product produces research and manual recommendations only.
- **Never invent data.** No fake supplier price, sales count, market competition, legal permission or fee represented as live. Missing data means `null` plus reason. Demo data needs an unmissable banner.
- **Never force three approved products.** Zero can be an appropriate outcome.
- **Hard gates supersede scores**: supplier permission, exact variant, actual landed cost, safety, stock/delivery, required margin, demand source and returns.
- **Money uses integer minor units and a documented decimal/rate implementation**, not arbitrary floats.
- Supplier feed data, user-entered research and licensed market metrics have separate provenance and permitted-use tags.
- **No secrets in Vite/browser bundle, public GitHub repo or frontend environment variables**. The Supabase publishable key is allowed if RLS is correctly implemented; service/secret keys belong only to server/Edge.
- Respect user choice: don't build account-type prompts, seller-account conversion workflows, or listing automations.
- Keep hosting literally on GitHub Pages for the first deploy. If blocked by a plan limitation, report it and propose alternatives, don't silently switch hosting.

## Working method

1. Inspect repo for existing structure. If empty, initialise pnpm workspace.
2. Work in **Phase 0 → Phase 1 → Phase 2**; don't attempt all phases in one turn.
3. Before code: summarise target milestone in 5 lines, flag environmental dependencies.
4. Implement complete vertical slices: feature UI + schema/types + tests + error/empty/loading states + docs.
5. Run locally available lint, typecheck, tests and build before claiming success.
6. On phase completion, provide: what works, files changed, commands/tests run, any failing tests, what is demo, missing credentials/permissions, next phase.
7. Ask for Supabase/GitHub credentials only when needed, and never request them to be pasted into tracked files or committed source.
8. Do not commit compiled `dist` or raw private supplier data except unavoidable GitHub Pages deployment artifacts.

## Preferred conventions

- Strict TypeScript, ESLint, Prettier, Zod at all external boundaries.
- Domain logic in `packages/domain`, not in React event handlers.
- TanStack Query for remote data; React Router HashRouter for GitHub Pages path handling.
- React components with composition and accessible labels, shadcn/ui standards.
- Supabase RLS + least privilege; separate owner vs analyst roles.
- Explicit unit naming, e.g. `sellingPricePence` rather than `price`.
- ISO timestamps UTC storage and `Europe/London` display.
- No PII in tests or demo fixture data.
- Feature flag source capability, authorisation and retention; blocked means fail closed.
- Date-versioned eBay fee policy; demo fee values only until officially confirmed.
- Keep `docs/CHANGELOG.md` and `docs/decisions/` up to date.

## First user-visible result

A modern dashboard at the GitHub Pages URL with seeded historical leads labelled **UNVERIFIED** and a **DEMO** mode (if backend missing). It must let the user review product data, enter verified costs manually, calculate economics, inspect gate failures, and see why rating is withheld.

## Definition of done

Do not report feature complete until its working controls, test coverage, failed/empty path, exact data source and documented limitations exist. Screenshots/mockups alone do not count as implementation.
