# Implementation plan / milestone ticket set

Use the master spec for all requirements. This file translates it into tractable milestones. Commit after each milestone. Every task must satisfy acceptance criteria, not just code generation.

## Milestone P0 — Initialise and deploy a real frontend

**Tasks**
- [ ] Create pnpm monorepo: `apps/web`, `packages/domain`, `packages/fixtures`, `packages/connectors`.
- [ ] React 19/Vite/TypeScript strict, Tailwind, shadcn/ui, Lucide, React Router HashRouter, TanStack Query/Table, Recharts, Zod, Vitest.
- [ ] AppShell: responsive sidebar/mobile tabs, header, navigation, settings and light/dark toggle.
- [ ] All routes scaffolded with useful empty state (not broken navigation).
- [ ] Vite `base` correct for GitHub Pages repository URL.
- [ ] Demo data fixture (20 unverified leads) and conspicuous DEMO DATA banner.
- [ ] CI: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- [ ] GitHub Pages deployment workflow and clear setup README.

**Acceptance:** `pnpm build` succeeds; deployed site loads from path under GitHub Pages; direct navigation handled; mobile layout tested.

## Milestone P1 — Research explorer, formula engine, scoring shell

**Tasks**
- [ ] Product Explorer: search/filter/sort, supplier, risk, missing data, status, pagination.
- [ ] Detail view: SKU, spec, supplier info, source dates, history placeholder, provenance.
- [ ] Compare page for up to five products.
- [ ] Money type, tiered fee engine, advertising/returns, scenario calculator, absolute contribution, margin %, break-even and threshold solver.
- [ ] Portfolio float exposure calculator (target £200–£500).
- [ ] Hard gating engine with typed reasons; no overall rating when evidence is missing.
- [ ] Versioned transparent scoring model; radar/bar breakdown with exact inputs.
- [ ] Show 20→N funnel, no forced top 3 approval, export demo CSV.
- [ ] Vitest cases for decimal money, fee tiers, shipping null, no-demand score, high-score gate fail.

**Acceptance:** Every product explainable; none of the 20 seed leads approved without validated additional information; controls recalc results; tests pass.

## Milestone P2 — Supabase and private access

**Tasks**
- [ ] Add Supabase CLI project and migrations, Auth, RLS, storage policies, roles.
- [ ] Login/logout, invite-only workspace, email callback configured to GitHub Pages URL.
- [ ] Generate TS database types and repository functions; persisted products/watchlists/assumptions.
- [ ] User-configurable thresholds, versioning, fee policy effective dates.
- [ ] RLS tests: owner, analyst, unrelated user, anonymous.
- [ ] Never ship service role/secret key to browser; security review.

**Acceptance:** User A/B isolated; no public query of private product data; app can work after refresh; auth errors handled gracefully.

## Milestone P3 — Supplier import and evaluation

**Tasks**
- [ ] Private CSV upload with column mapping, preview, reject report and commit.
- [ ] Supplier profile, evidence docs, permission workflow, sample fulfilment checklist.
- [ ] Duplicate SKU handling, GTIN/variant matching, stock snapshots.
- [ ] Supplier source adapter contract, mock HTTP supplier connector with allow-list.
- [ ] Rate limits/timeouts; batch import and rollback/error handling.
- [ ] Source/licence/allowed-use metadata on all evidence.

**Acceptance:** 500-row CSV imports correctly; malformed data produces row-level errors; replay idempotent; shipping null never treated as free.

## Milestone P4 — Scheduled research pipeline

**Tasks**
- [ ] Versioned research runs; persisted per-product stage transitions and reasons.
- [ ] Background small-batch processing with retry/lease/idempotency.
- [ ] Supabase Cron schedule; manual Run Now; dashboards of run state and source freshness.
- [ ] Confidence score and evidence blocking; human approve/reject and audit log.
- [ ] Source stale/stock changed/risk alerts.

**Acceptance:** Repeatable scan and comparison of two runs, complete failure reporting, missing sources block ratings, cron run creates proper audit record.

## Milestone P5 — Advanced reporting and hardening

**Tasks**
- [ ] Full CSV and XLSX versioned report with source log.
- [ ] Compare run charts; search/list performance for large catalogues.
- [ ] Source licences page; report signing/retention/deletion.
- [ ] Comprehensive Playwright mobile/desktop flows, RLS audit and threat checks.
- [ ] Accessibility and keyboard navigation pass.
- [ ] Deployment/runbook, backup/export instructions, cost alerts.

**Acceptance:** Reports match underlying run snapshot, private signed downloads, no public source disclosure, reproducible build.

## Milestone P6 — Licensed marketplace evidence (optional / blocked without permissions)

**Tasks**
- [ ] Document explicit consent, allowed eBay API fields and commercial use permission.
- [ ] Add provider-specific feature flags and evidence retention policy.
- [ ] Implement licensed supplier/market-provider import rather than scraping.
- [ ] Add competitor and 30/90-day demand evidence with exact SKU match and units, only when permitted.
- [ ] Provider permission regression tests before processing data.

**Acceptance:** If permission absent, app remains fully usable for supplier analysis + manually authorised research. No invented sold data.

## Milestone review template

```text
MILESTONE:
IMPLEMENTED:
DEMO VS LIVE:
TEST RESULTS (commands and counts):
DEPLOYED URL:
NEW FILES:
KNOWN GAPS / LEGAL DATA LIMITATIONS:
SECURITY NOTES:
NEXT STEPS:
```
