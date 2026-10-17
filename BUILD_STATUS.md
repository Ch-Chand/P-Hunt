# Current project status

This is an unfinished source snapshot, prepared for transfer to the owner's GitHub account.

## Present

- pnpm workspace and React/Vite/TypeScript configuration.
- Draft money, economics, gating and scoring domain functions with test files.
- Twenty historical UNVERIFIED lead fixtures and disabled marketplace connector contracts.
- Draft CI/Pages workflows and deployment/architecture documentation.

## Still required before P0/P1 acceptance

- Implement the React application and stylesheet (`apps/web/src/App.tsx` and `styles.css` are absent).
- Complete dependency installation and generate the lockfile.
- Integrate and verify explorer, comparison, calculator, dashboard and evidence explanations.
- Run lint, typecheck, tests, build and desktop/mobile smoke checks; fix resulting failures.
- Deploy to GitHub Pages and verify its repository base path.

No successful validation or deployment is claimed. The draft workflows require a lockfile and a complete application, so they cannot pass in this snapshot. Keep this snapshot on a development branch until those tasks are complete.

All supplied lead data remains DEMO/UNVERIFIED. No production Supabase credentials, P2 implementation, live marketplace data, scraping or listing/order automation has been introduced.
