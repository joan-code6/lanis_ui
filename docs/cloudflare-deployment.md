# Frontend deployments

LANIS UI is hosted as static assets on Cloudflare Workers. The backend stays at
`https://lanis-backend.joancode.dev`.

## Automatic deployments

- Every pull request builds on an ephemeral GitHub-hosted runner. Fork PRs from
  all outside contributors require a maintainer's workflow approval in GitHub.
- Successful builds publish a stable PR preview at
  `https://pr-N-lanis-ui-preview.bennetjoanwegener.workers.dev`.
  Wrangler also prints a generated URL for that exact uploaded version.
- A bot comment and GitHub deployment link expose the preview. Later commits
  update the same comment and PR URL. Closed PRs and obsolete builds are skipped.
- Successful pushes to `main` deploy production at `https://lanis.arg-server.de`.
  Only the current main commit can deploy. A failed build keeps the previous
  deployment live. There are no path filters: every main push builds.
- Production and preview uploads use separate Workers (`lanis-ui` and
  `lanis-ui-preview`). PR builds never update production traffic.
- Previews use the live API. After signing in, actions affect the real account.
  Preview responses include a noindex header. Preview URLs are public; their
  generated names are not access control.

## Build

The repository root is the build root. Node 24 installs the lockfile with
`npm ci`. Chrome is installed on the Ubuntu runner, then `npm run build` runs
TypeScript, Vite, and the existing Puppeteer prerenderer. `PRERENDER_STRICT=1`
makes a missing browser fail the deployment instead of skipping prerendering.
The artifact must contain `index.html`, `status/index.html`, and `sw.js`.

Hosted builds use `NODE_ENV=production` and
`VITE_API_URL=https://lanis-backend.joancode.dev`. These are public frontend
settings; never put credentials in `VITE_*` variables. `.env.production` supplies
the API URL for local production builds too. Local `npm run dev` stays in
development mode.

## Deployment credentials and trust

The repository Actions secret `CLOUDFLARE_API_TOKEN` requires only Account /
Workers Scripts / Edit on account `1a4a95ea6e17217ddfaf34660aaf25a2`.
The account ID is public configuration. Domain/DNS management is done separately
through Cloudflare, so CI does not need zone or DNS write access.

The `Frontend build` workflow has a read-only GitHub token, no deployment
credentials, no persisted checkout credentials, and no shared dependency cache.
The `Cloudflare deployment` workflow runs via `workflow_run` from the default
branch and verifies the source workflow path, repository, event, result, and
current commit before downloading the artifact from that exact run.

The deployment job checks out default-branch code only. It installs a pinned
Wrangler separately, creates its own fixed asset-only configuration outside the
downloaded artifact, and never runs PR scripts, package hooks, Worker entry
points, or Wrangler configuration. It rejects symlinks and oversized assets.
Third-party Actions are pinned to full commit SHAs.

Keep GitHub Settings / Actions / General / fork PR approval set to **all external
contributors**. Review code and workflow changes before approving outside runs.
Only trusted maintainers should have write access or change workflows and
repository secrets. There is no `pull_request_target` workflow.

## Local verification and manual publishing

```sh
npm ci
# On ARM Linux, use a native Chromium installation with
# PUPPETEER_EXECUTABLE_PATH=/path/to/chromium instead of downloaded x86 Chrome.
PRERENDER_STRICT=1 npm run build
node --test scripts/cloudflare/*.test.cjs
npx wrangler deploy --dry-run
npx wrangler dev
```

After `npx wrangler whoami` confirms authentication, `npm run deploy` publishes
the existing `dist` to the production Worker. Prefer the main workflow for normal
releases. To upload a manual preview without touching production:

```sh
npx wrangler versions upload --name lanis-ui-preview --preview-alias manual
```

The preview Worker is initially bootstrapped with an asset deployment. Normal
PR workflows only upload preview versions. Cloudflare retains a limited history
of versions/aliases; these URLs are for review, not permanent archives.

## Domain and rollback

The Custom Domain `lanis.arg-server.de` points to `lanis-ui`, managed separately
from CI. Cache headers make HTML and `sw.js` revalidate; fingerprinted assets
are immutable. Existing browser storage and PWA identity stay with the domain.

For a bad release, use Cloudflare's deployment rollback or authenticated
`npx wrangler rollback --name lanis-ui`, then revert the bad change on main.
Rebuilding main otherwise republishes its current contents.

Before switching from Appwrite, the frontend DNS record was an unproxied CNAME
to `appwrite.network` (automatic TTL). The existing CAA records were `pki.goog`
and `certainly.com`. To return to Appwrite, first remove the Worker Custom Domain
and restore that CNAME; the Appwrite deployment must still be available.

Appwrite hosting is retired only after Cloudflare checks pass. Removing an
Appwrite subscription, project, or deployment is separate from this repository.
