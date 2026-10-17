# LANIS UI

A responsive, unofficial frontend for **Schulportal Hessen**, built with React, TypeScript, Vite, and Tailwind CSS. LANIS UI connects to [lanis_api](https://github.com/joan-code6/lanis_api), which handles Schulportal authentication and data access.

The interface brings together a dashboard, messages, Mein Unterricht (courses, homework, and attendance), calendar, timetable, study groups, file storage, substitution plans, DSBmobile, and elections. It also includes global search, configurable themes, and PWA installation and push notification support. Available modules depend on the school and account.

## Use LANIS online

**[Open LANIS at lanis.arg-server.de](https://lanis.arg-server.de)** — no local installation required. You can also **[try the demo](https://lanis.arg-server.de/demo)** with sample data before signing in.

**Bring your own backend:** the hosted UI can connect to your own compatible [lanis_api](https://github.com/joan-code6/lanis_api) instance. Open **[Custom backend](https://lanis.arg-server.de/set-custom-backend)**, enter your backend's HTTPS base URL, and save. The selection is stored in your browser, and you can reset it on the same page. You do not need to host or rebuild the frontend to use a custom backend. Your backend must allow `https://lanis.arg-server.de` through CORS.

## Run locally

Use **Node.js 22.12+** and npm. Vite 7 requires Node.js `^20.19.0 || >=22.12.0`.

```sh
git clone https://github.com/joan-code6/lanis_ui.git
cd lanis_ui
npm ci
cp .env.example .env.local
npm run dev
```

Open **http://localhost:3000** (or the address Vite prints if that port is occupied).

- Visit **`/demo`** to explore the interface with bundled sample data, without a Schulportal login or a running backend for the mocked module flows.
- For real data, start a compatible [lanis_api](https://github.com/joan-code6/lanis_api) instance separately, configure its URL below, and visit **`/login`**. Choose your school and sign in with your Schulportal account.
- The landing page is at `/`; public service status is at `/status`.

Demo fixtures and responses live in [`src/components/demo/`](src/components/demo/). Demo coverage is limited to the routes and requests implemented there; it does not verify real backend integration.

## Connect the backend

Set the API base URL in `.env.local`:

```dotenv
VITE_API_URL=http://localhost:8000
```

This is also the fallback when the variable is unset. Use the backend base URL, without an extra `/api` suffix unless your backend is actually hosted under that prefix. Restart Vite after changing environment variables.

The browser calls this URL directly, so:

- The backend must be reachable **from the browser**. On another device, `localhost` refers to that device.
- [lanis_api](https://github.com/joan-code6/lanis_api) must allow the frontend origin through CORS, including the actual dev server port.
- Remote backend URLs must use HTTPS. HTTP is accepted only for loopback hosts such as `localhost` and `127.0.0.1`.
- `VITE_*` values are public and embedded in the frontend bundle. Never put credentials or private keys in them.

[`vite.config.ts`](vite.config.ts) also defines a development-only `/api` proxy to `http://localhost:8000`, stripping the `/api` prefix. The default API client uses `VITE_API_URL` directly; changing that proxy alone does not change the client's backend.

### Browser-specific backend override

Open **`/set-custom-backend`** to select or reset a custom backend. The page checks `GET /health` for a JSON response containing `"status": "ok"` before saving the URL in local storage. Switching backends signs out the current session, clears backend-specific cached data, and reloads the login page.

A saved override takes precedence over `VITE_API_URL` for the main API client. Public homepage map data uses the configured default backend instead. Implementation: [`src/utils/backendConfig.ts`](src/utils/backendConfig.ts).

## Commands and checks

Run commands from the repository root:

```sh
npm run dev       # Vite development server, default port 3000
npm run preview   # Serve an existing dist/ build locally
npx tsc --noEmit  # Type-check without producing a build
```

Focused timetable regression checks:

```sh
node scripts/test-timetable-colours.cjs
node scripts/test-timetable-exams.cjs
node scripts/test-timetable-refresh.cjs
```

The status page has a Puppeteer smoke check. With the development server already running:

```sh
STATUS_UI_URL=http://localhost:3000 node scripts/status-smoke.mjs
```

It checks mobile and desktop layouts and simulated service states, and writes screenshots to `/tmp/lanis-status-*.png`. It requires a usable Chrome installation; set `CHROME_BIN` to an executable path if needed.

There is no `npm test` script. An `npm run lint` script exists, but ESLint and its configuration are not included in this checkout, so it is not currently a ready-to-run validation step.

## Build and hosting

**Repository-local instruction:** [`AGENT.md`](AGENT.md) says `dont run build...`. Automated coding agents should respect that instruction; the commands below document the release process.

```sh
npm run build
npm run preview
```

The build runs TypeScript checking and Vite, then npm automatically runs `postbuild`. That step uses Puppeteer to prerender `/` and `/status` into `dist/`, temporarily serving the build on port **5179**.

- If Chrome or its runtime libraries are unavailable, prerendering normally logs a warning and skips that step.
- Set `PRERENDER_STRICT=1` to fail on an unavailable browser instead.
- Set `SKIP_PRERENDER=1` to explicitly skip prerendering.

For example, a release environment that requires prerendered output can use:

```sh
PRERENDER_STRICT=1 npm run build
```

Host the contents of **`dist/`** as a static site over HTTPS. Configure the host to serve existing assets and prerendered pages first, then fall back to **`/index.html`** for client-side routes such as `/login`, `/dashboard`, and `/demo/messages`. The app uses root-relative routes and assets, so deploy it at the domain root unless you also adapt those paths.

Set `VITE_API_URL` **before building** for the target environment. Changing server environment variables after uploading `dist/` does not rewrite the compiled API URL. The Vite dev proxy is not part of the static deployment.

The service worker is registered automatically in production and caches the app shell. PWA and push behavior should be checked in a secure browser context with a compatible backend; shell caching does not make every module fully usable offline.

## Where to make changes

```text
src/
  App.tsx               Public, demo, and authenticated routes
  main.tsx              React entry point and service worker registration
  components/           Feature screens, layout, shared UI, and demo fixtures
  contexts/             Authentication, preferences, and theme state
  services/api.ts       API clients, request methods, and token refresh
  types/                Shared TypeScript data contracts
  utils/                Backend selection, caches, timetable helpers, and more
  index.css             Global styles and theme variables
public/                 Static assets, manifests, themed icons, service worker
scripts/                Prerendering, asset generation, and focused checks
tailwind.config.js      Tailwind theme and design tokens
vite.config.ts          Development server and proxy configuration
```

For a feature change, start with its screen in `src/components/`, follow its calls into `src/services/api.ts`, and update shared contracts in `src/types/` as needed. Keep demo responses in sync when changing a flow supported by `/demo`. [`api-documenation.md`](api-documenation.md) provides additional endpoint notes; check current client code and [lanis_api](https://github.com/joan-code6/lanis_api) when confirming contracts.

Work in a dedicated Git worktree when contributing in the combined LANIS workspace. Frontend changes belong here; backend changes belong in [lanis_api](https://github.com/joan-code6/lanis_api), and private operator pages belong in **lanis_admin**.

## Troubleshooting

- **School list or login fails:** inspect the browser's Network panel for the request URL and response. Check that [lanis_api](https://github.com/joan-code6/lanis_api) is running, the API URL is correct, and CORS allows the frontend origin.
- **The app still contacts an old backend:** reset the saved override at `/set-custom-backend`, then check `.env.local` and restart Vite. Deployed bundles require a rebuild to pick up a new default URL.
- **Refreshing a nested route returns 404:** configure the static host's SPA fallback to `/index.html`.
- **Old UI remains after deployment:** check the service worker and caches in browser developer tools. Unregister the worker and reload to diagnose stale shell assets; clearing site storage also removes saved sessions and preferences.
- **Prerendering fails:** check Chrome availability, its system libraries, and whether port 5179 is free. See the prerender environment options above.

Authentication tokens, preferences, and some module data are stored in the browser. Use test accounts for authenticated development, and keep credentials, tokens, `.env.local`, and personal school data out of commits and bug reports.

## Android app

The Capacitor Android app uses encrypted native session storage, offline timetable data, widgets, and configurable navigation. Setup and release instructions: [docs/android.md](docs/android.md).
