# P0/P1 demo status

P0/P1 application implementation is complete and runs without API keys. Local lint, strict typecheck, 60 unit tests and the repository-path production build pass. Desktop and mobile Chromium smoke checks cover navigation, the comparison limit and portfolio float, calculator/unknown costs, evidence gates, demo runs and CSV downloads. See `docs/validation.md` for the final validation and deployment record.

Delivered: responsive shell and theme, dashboard, 20-lead explorer/filter/sort/pagination, details/provenance, up-to-five comparison and session watchlist, integer-pence economics/scenario/threshold/portfolio calculators, typed hard-gate reasons, a separate synthetic evidence/scoring lab, local screening snapshots, safe labelled CSV, CI and GitHub Pages workflows.

All historical leads remain DEMO/UNVERIFIED, with no final seed ratings or approvals. Synthetic sandbox evidence is separate and explicitly fictional. Edits and run history reset on reload; only theme persists. Authentication, private persistence, supplier uploads, schedules and production integrations remain later milestones. No P2 or production Supabase credential has been introduced.

The source is on `Ch-Chand/P-Hunt/main` and the demo is live at **https://ch-chand.github.io/P-Hunt/**. The owner changed the repository to public and enabled Pages after the initial permission blocker. Deployment run `39027458829` passed. Live desktop/mobile Chromium checks confirmed the dashboard, hash-route reload, explorer filtering and calculator with HTTP 200 and no browser errors. See the validation record for the evidence.
