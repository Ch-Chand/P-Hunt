# UK eBay Product Intelligence

> **Work in progress — not a runnable P0/P1 release yet.** The domain rules, fixtures, connector guards and deployment configuration have been drafted. The React `App.tsx` and stylesheet are still missing, dependency installation has not completed, and lint/typecheck/tests/build have not passed. The feature and usage sections below describe the intended delivery; they are not completion claims. See [BUILD_STATUS.md](BUILD_STATUS.md).

A responsive research workspace for reviewing UK supplier leads, checking evidence and modelling contribution before overhead and income tax. This repository implements **P0 and P1 only**, with no API keys, paid services or backend required.

**DEMO DATA — all 20 historical leads are UNVERIFIED.** Historical advertised source prices are reference observations from the supplied CSV, not current supplier quotes or confirmed landed costs. No seed product has verified demand or a final rating. A useful outcome can be zero approved candidates.

The GitHub Pages app is a **public static demo**, including when the repository itself is private. Its login shell does not authenticate users or protect business data. Do not enter confidential research, documents or credentials. Supabase Auth, private persistence, RLS and scheduled jobs are reserved for P2 and later work.

## Run locally

Use Node.js 24 and pnpm 11.25.0 (also specified in `package.json`). If pnpm is missing, install it with `npm install --global pnpm@11.25.0`.

```bash
pnpm install
pnpm dev
```

Open the localhost URL printed by Vite. No `.env` file is required. Optional public build configuration is documented in [.env.example](.env.example); it contains no usable credentials.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

The build artifact is `apps/web/dist`; it is ignored by Git and is uploaded only as a Pages deployment artifact. The exact validation results for this delivery are recorded in [docs/validation.md](docs/validation.md).

## Use the demo

- Review the dashboard and the complete 20-product explorer. Search, filter, sort and inspect the provenance and missing evidence for each lead.
- Open a product to inspect hard gates and use its scenario calculator. Unknown shipping remains unknown until you supply an explicit hypothetical amount. Editing a scenario cannot verify a supplier quote or create sales evidence.
- Compare up to five candidates. All financial amounts are GBP pence internally; visible fee assumptions are illustrative and date-versioned.
- Inspect the evidence-complete synthetic example to understand a score breakdown. It is a separate demonstration, never a verified seed lead or a recommendation.
- Run the local demo screening and export its clearly labelled CSV. It evaluates existing fixtures; it never calls a supplier or marketplace.

Scenario/research edits are session-only and reset on reload. Theme and demo selection preferences may remain in browser storage; no private research persistence is implemented. Routes outside P0/P1 explain their future requirements rather than pretending an integration exists.

## Connect a GitHub repository to Pages

The workflow is ready; **no remote repository, Pages URL or successful deployment is claimed by this local build**. The complete setup and troubleshooting runbook is in [docs/deployments.md](docs/deployments.md).

1. Create an empty GitHub repository. GitHub Free generally requires a public repository for Pages; check the repository's plan and Pages availability before uploading anything. Only publish the supplied demo data and code.
2. Commit the source and lockfile, add your GitHub remote, and push branch `main`. Example commands are in the runbook; do not add secrets or compiled `dist` files.
3. In the repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Open **Actions → Deploy demo to GitHub Pages → Run workflow → main**. Subsequent pushes to `main` run lint, typecheck, tests and build before deployment. If the `github-pages` environment requires approval, approve that deployment in Actions.
5. Open the URL shown by the deploy job. Normally it is `https://OWNER.github.io/REPOSITORY/`. The workflow calculates that repository path automatically. `OWNER.github.io` root repositories use `/`; for a custom domain, set repository variable `VITE_BASE_PATH` to `/` and configure the domain in Pages.

HashRouter keeps direct routes under the static site path, for example `https://OWNER.github.io/REPOSITORY/#/products`. No PAT or Supabase credential is needed for this demo deployment: GitHub Actions uses its built-in deployment identity.

## Scope and engineering choices

The pnpm workspace separates the React 19/Vite web app, tested pure TypeScript domain rules, demo fixtures and disabled connector contracts. The UI uses Tailwind, shadcn/Radix primitives, TanStack Query/Table and Recharts.

- [Architecture and implementation boundary](docs/architecture.md)
- [Money, fee, gating and scoring methodology](docs/methodology.md)
- [Data sources and permission limits](docs/data-sources.md)
- [Security and public-demo limitations](docs/security.md)
- [Architecture decisions](docs/decisions/0001-static-demo-and-pages.md)
- [Changelog](docs/CHANGELOG.md)

There is no scraping, invented sold-history API, automatic listing, repricing, ordering or fulfilment. eBay marketplace-history and price modelling capabilities stay disabled until source-specific licence and consent are verified. Ordinary Browse access does not provide sold history or grant unrestricted analytics rights. P2 begins only with a separately authorised Supabase implementation; no production Supabase credential is introduced here.

