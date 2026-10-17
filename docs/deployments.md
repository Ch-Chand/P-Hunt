# GitHub Pages deployment runbook

This runbook deploys the P0/P1 static **DEMO** on GitHub Pages. No GitHub repository has been created or pushed by these setup instructions. A passing local build does not prove that a hosted URL works.

## Prerequisites and visibility

You need a GitHub account that can create/push a repository and configure its Pages settings. Node.js 24 and pnpm 11.25.0 are the local runtime/tooling baseline. The workflow reads the exact pnpm version from `package.json`.

GitHub Pages serves public static files. A private source repository does not make the website or its JavaScript fixtures private. GitHub Free generally requires a public repository for Pages; other plans and organisations may impose restrictions. Check **Settings → Pages** and organisation Actions policies first. If the plan blocks Pages, stop and report that limitation. Do not silently change hosting. Keep private supplier information out of the repository and build artifact.

## Create and push the repository

Create an empty repository on GitHub, choosing a name such as `ebay-uk-product-intelligence`. Do not initialise it with another README if you will push this existing tree. In the project directory, review the files before committing:

```bash
git status --short
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

If the directory is not yet a Git repository, initialise it once:

```bash
git init -b main
```

Commit the reviewed source, including `pnpm-lock.yaml`. Do not force-push an existing shared repository or replace its remote. For a new empty repository:

```bash
git add .
git status --short
git commit -m "Implement P0 and P1 research demo"
git branch -M main
git remote add origin https://github.com/OWNER/REPOSITORY.git
git push -u origin main
```

Replace `OWNER` and `REPOSITORY` with your actual account/organisation and repository name. Authenticate through your normal Git credential manager or SSH setup; never paste a token into source, an environment example, a remote URL or a workflow file. For an existing clone, inspect `git remote -v` and push to the already-correct remote instead of adding another origin.

## Enable Pages and run deployment

1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**. This workflow uploads its own static artifact; do not choose a `docs` or `gh-pages` branch source.
3. In **Settings → Actions → General**, confirm Actions and the standard GitHub/pnpm actions used by the workflows are permitted. The YAML requests only the permissions its jobs need; do not add a personal access token.
4. Open **Actions → Deploy demo to GitHub Pages → Run workflow**, choose `main`, then run it. The initial push may have run before Pages was enabled; dispatching now retries with the correct setting.
5. Watch `Validate and build Pages artifact`. It installs the locked dependency tree, runs lint/typecheck/tests, resolves the asset path, builds and uploads `apps/web/dist`.
6. Watch `Deploy GitHub Pages`. GitHub uses the built-in `GITHUB_TOKEN` and OpenID Connect permission (`id-token: write`); no repository deployment secret is needed.
7. If the `github-pages` environment is waiting for a reviewer, open the deployment's **Review deployments** action and approve it as an authorised reviewer. Environment rules are under **Settings → Environments → github-pages**. A rule must permit deployments from `main`; retain required reviews if that is your intended release policy.
8. Open the URL reported by the deploy job. Confirm the DEMO banner appears, `/products` navigation works, and refreshing a URL containing `#/products` succeeds.

Pushes to `main` repeat the validated deployment. Pull requests run the CI workflow only; they do not deploy to production. Deployment repeats the validation commands in its own job, so it cannot upload a newly failing build while relying on another workflow's older status.

## Base path and custom domains

For a project repository named `REPOSITORY`, the workflow sets `VITE_BASE_PATH=/REPOSITORY/` and the standard URL is `https://OWNER.github.io/REPOSITORY/`. A root repository named `OWNER.github.io` gets `/`. Repository names are discovered from `GITHUB_REPOSITORY`, so renaming the repository does not require hard-coding a new path in the workflow.

For an explicit override, open **Settings → Secrets and variables → Actions → Variables → New repository variable** and set `VITE_BASE_PATH`. Use `/` for a custom-domain root, or `/REPOSITORY/` for a project path. Paths must start and end with `/`; this workflow accepts path segments containing letters, digits, underscores and hyphens. This is public configuration, not a secret. The deploy job receives the build produced with that path.

Configure a custom domain and HTTPS in **Settings → Pages**, follow GitHub's documented DNS/verification instructions, set `VITE_BASE_PATH=/`, and rerun the workflow. Domain purchase and DNS changes are separate owner-controlled actions. The app uses HashRouter; example links are `https://example.co.uk/#/products`. Do not remove the hash or expect GitHub Pages to execute a server-side route handler.

No `.env` file is required locally. If you deliberately test a project path with an inline environment override on bash:

```bash
VITE_BASE_PATH=/REPOSITORY/ pnpm build
VITE_BASE_PATH=/REPOSITORY/ pnpm preview
```

Open the preview URL with `/REPOSITORY/` appended. Use the app's hash links to navigate. Rebuild with `/` to return to a root-path local preview.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Pages unavailable in Settings | Account plan, repository visibility, organisation Pages policy and repository admin permissions. |
| Configure Pages reports no Pages site | Select GitHub Actions as the Pages source, then dispatch the workflow again. |
| Deploy waits indefinitely | `github-pages` environment reviewers, branch restrictions and any organisation deployment rules. |
| JavaScript/CSS 404 | Compare the artifact's base path with the actual project/custom-domain URL; correct `VITE_BASE_PATH`, rebuild and redeploy. |
| Direct `/products` URL returns 404 | Use `/#/products` (or `/REPOSITORY/#/products`), as generated by HashRouter. |
| CI/deploy install fails | Ensure the committed lockfile matches `package.json` and the pnpm version; run `pnpm install` locally and commit intentional lockfile changes. |
| Workflow action is denied | Check allowed-actions policy and the job's minimal Pages/OIDC permissions. Do not work around it with embedded credentials. |

## Stop before P2

No Supabase project, migration, auth redirect, production key, Edge Function or scheduled import is configured by P0/P1. The placeholder public variables in `.env.example` remain empty and are not used to enable a backend.

P2 requires a separate development setup, invite-only Auth, workspace membership/roles, database and Storage RLS tests, callback URLs matching the chosen Pages origin/path, and verification that unrelated/anonymous users cannot read business data. Only a publishable key may eventually enter a browser build; service and provider secrets belong exclusively to a secured backend. Do not enter a production Supabase credential as part of these Pages instructions.

