# P0/P1 validation record

Date: 17 October 2026 (Europe/London)

| Check                                | Outcome                                                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`     | Dependency installation completed; committed pnpm lockfile and explicit esbuild build-script allowlist.                               |
| `pnpm lint`                          | Pass, no errors or warnings.                                                                                                          |
| `pnpm typecheck`                     | Pass, strict TypeScript.                                                                                                              |
| `pnpm test`                          | Pass: 60 tests in 4 files.                                                                                                            |
| `VITE_BASE_PATH=/P-Hunt/ pnpm build` | Pass; static output `apps/web/dist`, React/chart chunks separated.                                                                    |
| Desktop/mobile Chromium checks       | Pass: 10/10, desktop and iPhone-sized Chromium, including mobile secondary navigation and multi-product budget overspend.             |
| GitHub Pages deployment              | **PASS:** run `39027458829`, both build and deployment jobs successful. Live URL https://ch-chand.github.io/P-Hunt/ returns HTTP 200. |

Financial coverage includes exact decimal parsing, half-up rounding, progressive fee tiers, order thresholds, fee VAT, VAT-included/excluded quotes, quantities/GTC renewal allocation, null shipping, absolute contribution AND exact margin, stress losses, bounded threshold solving and multi-product float exposure. Evidence coverage includes absent/stale demand, asking/cumulative sold rejection, mismatched packs, prohibited/expired sources, disabled eBay use and high scores failing independent supplier/safety gates. Export tests cover unknown values, full-universe provenance and spreadsheet formula injection.

Browser checks exercise the production build under its GitHub project path, theme/navigation, search/filter/pagination, five-product cap, portfolio overspend, economics recalculation, unknown shipping, invalid inputs, threshold solver, synthetic scoring/safety, session runs and CSV download. Chromium at a mobile viewport is not a real iPhone/Safari or Android device test.

All 20 seed products remain unscored and unapproved. No Supabase connection, RLS/private-data claim, live market integration, scraping or automation is present. No runtime credentials are needed or bundled. Deployment presence alone is not evidence of private application access.

## Hosted execution

- Source: https://github.com/Ch-Chand/P-Hunt (public, changed by the owner).
- Successful deployment: https://github.com/Ch-Chand/P-Hunt/actions/runs/39027458829 — both build and Pages deployment jobs **PASS**.
- CI: https://github.com/Ch-Chand/P-Hunt/actions/runs/39027195683 — **PASS**: install, lint, strict types, 60 unit tests, build and 10 desktop/mobile browser checks.
- Live URL: **https://ch-chand.github.io/P-Hunt/** — HTTP 200 verified.
- Live Chromium checks at 1440×900 and 390×844: dashboard and DEMO banner visible; direct `#/products` route and reload work; searching “ratchet” returns one candidate; manually entering £3 delivery and £0.40 handling reproduces £2.80 contribution; no page exceptions or failed HTTP resources.

The initial deployment attempt failed because the integration could not create a Pages site. The owner made the repository public and enabled GitHub Actions as the Pages source, resolving that blocker. No alternative hosting or production backend has been introduced.
