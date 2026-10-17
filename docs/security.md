# Security and privacy boundary

**P0/P1 is a public demo and has no authentication or private storage.** The login shell describes the planned private workspace but grants no security guarantee. Anyone who can load the Pages site can inspect its code and bundled fixtures. A private GitHub repository does not make a Pages artifact confidential. Do not enter confidential business information into the demo.

No production Supabase credential, service-role key, provider token, eBay OAuth scope or supplier account is introduced. `.env.example` contains public configuration names and empty future public-key fields only. All `VITE_` values are compiled into browser-visible JavaScript; the prefix must never be used for secrets. The `GITHUB_TOKEN`/OIDC identity used by deployment remains inside GitHub Actions, not the artifact.

## Current safeguards and limits

- Pure domain rules validate input boundaries, preserve unknown data and keep hard gates independent of scores.
- Source capability and licence restrictions fail closed. All restricted marketplace flags start false; no network fallback or scraper exists.
- Demo CSV downloads are generated locally from demo content. They are not private signed server reports. Formula-like cells must be escaped before export.
- Scenario/research edits are session-only. Browser-stored preferences, where used, hold synthetic identifiers/theme only; local storage is not a security mechanism.
- No document upload, arbitrary URL fetching, customer/order/payment data, credential capture or private feed ingestion exists in this milestone.
- Git ignores environment overrides, dependencies, coverage and build output. Review `git status` before committing; ignore rules are not a substitute for inspecting staged files.

## Required before private business use (P2 and later)

Implement invite-only Supabase Auth and validate the chosen Pages callback origin/path. Add tenant-scoped tables and private Storage with least-privilege grants and RLS for anonymous users, owners, analysts and unrelated workspaces. Test that anonymous and cross-workspace access fails and that analysts cannot alter owner policy/secrets. A browser login alone does not protect a database with permissive grants.

Only Supabase URL/publishable key may eventually appear in the browser. Store service/provider credentials in secured server/Edge secrets. Authenticated Edge Functions must validate identity, membership, role, schemas and quotas independently. Scheduled jobs require a private server identity; they cannot trust a frontend flag.

Before adding external feed URLs, implement provider allow-lists, URL validation, SSRF controls, timeouts and bounded retries. Before uploads/reports, implement private buckets, MIME/size rules, signed expiring links, retention/deletion and an audit trail. These are explicitly future requirements, not claims of tests or protections delivered in P0/P1.

