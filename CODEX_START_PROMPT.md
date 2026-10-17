# Copy/paste this message into Codex

I am building a private UK eBay dropshipping **product research website**, not an automatic listing bot. Use the files in this repository as the complete requirements:

- `CODEX_MASTER_SPEC.md` — the full product requirements and engineering architecture
- `AGENTS.md` — non-negotiable implementation rules
- `IMPLEMENTATION_PLAN.md` — milestone acceptance criteria
- `twenty_unverified_leads.csv` — seed leads; source costs are **UNVERIFIED**, NOT live data

**Technology:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui + TanStack Table/Query + Recharts. Host the website on GitHub Pages, with Supabase reserved for Auth/PostgreSQL/Edge Functions/Cron. Do NOT use Streamlit. Use a pnpm monorepo and GitHub Actions CI/deployment.

**Begin with milestone P0 and P1 only.** Scaffold a production-quality, responsive website, seed a clearly labelled DEMO research dashboard, implement the 20-product explorer, comparison UI, unit-economics calculator, evidence completeness checks, hard-gate explanations, explainable ratings (only when evidence is complete), and GitHub Pages workflow. Keep the first build operable without API keys. Write tests for money and gating edge cases.

Don't fabricate real marketplace sales, supplier delivery costs or final product ratings. Don't scrape eBay. eBay marketplace-history/price modelling restrictions must remain feature-flagged off unless licence/consent has been verified. Don't implement publishing, repricing, orders or fulfilment automation.

First, inspect the repository and present a short milestone plan. Then actually implement P0/P1, run lint/typecheck/tests/build, report the outcome honestly and tell me exactly how to connect the GitHub repository to Pages. Stop before introducing a production Supabase credential or starting P2.
