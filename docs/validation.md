# P0/P1 validation record

Date: 17 October 2026 (Europe/London)

| Check                                | Outcome                                                                                                                                                                                         |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`     | Dependency installation completed; committed pnpm lockfile and explicit esbuild build-script allowlist.                                                                                         |
| `pnpm lint`                          | Pass, no errors or warnings.                                                                                                                                                                    |
| `pnpm typecheck`                     | Pass, strict TypeScript.                                                                                                                                                                        |
| `pnpm test`                          | Pass: 60 tests in 4 files.                                                                                                                                                                      |
| `VITE_BASE_PATH=/P-Hunt/ pnpm build` | Pass; static output `apps/web/dist`, React/chart chunks separated.                                                                                                                              |
| Desktop/mobile Chromium checks       | Pass: 10/10, desktop and iPhone-sized Chromium, including mobile secondary navigation and multi-product budget overspend.                                                                                     |
| GitHub Pages deployment              | Pending the completed-source push and Actions run. The connected app's direct Pages GET/POST returned HTTP 403 `Resource not accessible by integration`; repository visibility remains private. |

Financial coverage includes exact decimal parsing, half-up rounding, progressive fee tiers, order thresholds, fee VAT, VAT-included/excluded quotes, quantities/GTC renewal allocation, null shipping, absolute contribution AND exact margin, stress losses, bounded threshold solving and multi-product float exposure. Evidence coverage includes absent/stale demand, asking/cumulative sold rejection, mismatched packs, prohibited/expired sources, disabled eBay use and high scores failing independent supplier/safety gates. Export tests cover unknown values, full-universe provenance and spreadsheet formula injection.

Browser checks exercise the production build under its GitHub project path, theme/navigation, search/filter/pagination, five-product cap, portfolio overspend, economics recalculation, unknown shipping, invalid inputs, threshold solver, synthetic scoring/safety, session runs and CSV download. Chromium at a mobile viewport is not a real iPhone/Safari or Android device test.

All 20 seed products remain unscored and unapproved. No Supabase connection, RLS/private-data claim, live market integration, scraping or automation is present. No runtime credentials are needed or bundled. Deployment presence alone is not evidence of private application access.
