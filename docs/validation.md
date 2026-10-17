# P0/P1 validation record

Date: 17 October 2026 (Europe/London)

| Check                                | Outcome                                                                                                                                                                                                                                                                                                                |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`     | Dependency installation completed; committed pnpm lockfile and explicit esbuild build-script allowlist.                                                                                                                                                                                                                |
| `pnpm lint`                          | Pass, no errors or warnings.                                                                                                                                                                                                                                                                                           |
| `pnpm typecheck`                     | Pass, strict TypeScript.                                                                                                                                                                                                                                                                                               |
| `pnpm test`                          | Pass: 60 tests in 4 files.                                                                                                                                                                                                                                                                                             |
| `VITE_BASE_PATH=/P-Hunt/ pnpm build` | Pass; static output `apps/web/dist`, React/chart chunks separated.                                                                                                                                                                                                                                                     |
| Desktop/mobile Chromium checks       | Pass: 10/10, desktop and iPhone-sized Chromium, including mobile secondary navigation and multi-product budget overspend.                                                                                                                                                                                              |
| GitHub Pages deployment              | Attempted on main at `2a8dca7`: install/lint/typecheck/60 tests passed, then Configure Pages failed: `Create Pages site failed. Resource not accessible by integration`. Both direct app access and the workflow token cannot create the Pages site. No live deployment exists; repository visibility remains private. |

Financial coverage includes exact decimal parsing, half-up rounding, progressive fee tiers, order thresholds, fee VAT, VAT-included/excluded quotes, quantities/GTC renewal allocation, null shipping, absolute contribution AND exact margin, stress losses, bounded threshold solving and multi-product float exposure. Evidence coverage includes absent/stale demand, asking/cumulative sold rejection, mismatched packs, prohibited/expired sources, disabled eBay use and high scores failing independent supplier/safety gates. Export tests cover unknown values, full-universe provenance and spreadsheet formula injection.

Browser checks exercise the production build under its GitHub project path, theme/navigation, search/filter/pagination, five-product cap, portfolio overspend, economics recalculation, unknown shipping, invalid inputs, threshold solver, synthetic scoring/safety, session runs and CSV download. Chromium at a mobile viewport is not a real iPhone/Safari or Android device test.

All 20 seed products remain unscored and unapproved. No Supabase connection, RLS/private-data claim, live market integration, scraping or automation is present. No runtime credentials are needed or bundled. Deployment presence alone is not evidence of private application access.

## Hosted execution and owner action

- Source pushed to `Ch-Chand/P-Hunt/main`.
- Deployment attempt: https://github.com/Ch-Chand/P-Hunt/actions/runs/39027086447
- CI run: https://github.com/Ch-Chand/P-Hunt/actions/runs/39027086421 (status recorded after completion).
- Open https://github.com/Ch-Chand/P-Hunt/settings/pages and select **Build and deployment → Source → GitHub Actions**. If GitHub denies Pages for the private repository under the current account plan, an owner decision is required; repository visibility has not been changed.
- Once Pages is enabled, rerun **Deploy demo to GitHub Pages** on `main`. Successful deployment should report the project URL, normally `https://ch-chand.github.io/P-Hunt/`. This URL is expected, not verified live.

The connected integration and workflow returned an explicit permission denial. No alternative host, credential substitution, or repository visibility workaround has been used.
