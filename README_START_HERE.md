# Start here — UK eBay Product Intelligence website

This is a **specification package for Codex**, not a completed deployable website.

## Files

- `CODEX_MASTER_SPEC.md` — ~7,000-word requirements: business workflows, React/Supabase/GitHub Pages architecture, UI, data model, source licensing, formulas, ratings, security, tests, deployment.
- `AGENTS.md` — persistent instructions Codex should follow inside the repo.
- `IMPLEMENTATION_PLAN.md` — milestones P0–P6 and verifiable completion criteria.
- `CODEX_START_PROMPT.md` — a single copy/paste starter prompt.
- `twenty_unverified_leads.csv` — historical initial leads for seeded demo data. **Not verified offers or sell-through evidence.**

## Recommended workflow

1. Create new GitHub repository named `ebay-uk-product-intelligence` (on GitHub Free, note GitHub Pages is generally for public repos).
2. Add ALL files in this package to the repository root.
3. Open the repo in Codex; paste `CODEX_START_PROMPT.md` content into the new task.
4. Have Codex complete **P0 and P1 only**, show tests, and push to GitHub for review.
5. Enable GitHub Pages deployment from **GitHub Actions** under repository Settings → Pages.
6. After UI validation, set up Supabase and implement P2 onwards. Do not commit secrets.

## Deployment caveat

GitHub Pages serves React's built static HTML/JS/CSS. **It does not host a database, server-side APIs or secret keys.** Supabase is the separate backend and login provider. Sign-in prevents viewing private data, but the frontend's public JavaScript and assets remain visible to the world; never embed sensitive supplier information in the static bundle.

## Compliance caveat

The application's fully automatic eBay demand/sold-price intelligence is deliberately **not guaranteed**. Official Browse APIs do not provide ordinary historical sold data; Marketplace Insights is access-restricted; eBay developer terms restrict several algorithmic pricing, data derivation and seller-arbitrage uses. A research platform must respect source licences. It may still automate supplier-first screening and scoring with authorised evidence.
