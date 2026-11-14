# Token Doctor

Token Doctor is a local hackathon prototype for inspecting AI token usage, estimated spend and inference latency. It processes usage records in the browser and saves the active dataset, profile, pricing, thresholds and recommendation statuses in local storage.

## Run locally

Use Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Choose **Explore demo**, then create a local test account to load Demo AI Co. For a quick demo, open a cache finding under **Token Diagnosis**, inspect the supporting requests, and change its recommendation status. In **Live Token Usage**, choose **Poor caching** and start the simulator. After three matching requests, review the live finding and the measured local processing percentiles.

## Import data

Download the example JSON from **Settings → Data import**. Upload a JSON array or CSV with these columns.

```csv
timestamp,provider,model,application,input,output,cached,latency
2026-11-01T00:00:00Z,OpenAI,GPT-6.1 Sol,Support,1200,300,600,850
```

Use ISO timestamps with an explicit time zone and report latency in milliseconds. Token counts must be non-negative integers and cached input cannot exceed total input. Optional columns are `id`, `department`, `fingerprint`, `task`, and `simulated`. Unknown columns are ignored. Add matching model rates under **Example model pricing** to estimate spend for imported models. Importing replaces the active dataset.

## Connect Prompt Lab

Token Doctor can pull real usage from a deployed Prompt Lab (its `/api/usage/events` API).

1. In Prompt Lab's Sites settings, set `USAGE_API_TOKEN` (generate one with `openssl rand -hex 32`) and redeploy.
2. In this folder's `.env.local`, set `PROMPT_LAB_URL` to Prompt Lab's address and `PROMPT_LAB_USAGE_TOKEN` to the same token. Restart `npm run dev`.
3. Open **Settings → Data import** and choose **Sync from Prompt Lab**. The last 30 days replace the selected project's data.

The token stays on the server (`app/api/prompt-lab/route.ts`); never give it a `NEXT_PUBLIC_` prefix. Calls appear as provider `OpenAI`, application `Prompt Lab`, task `generate` or `chat`. Add a rate under **Example model pricing** whose model name matches the synced model to see spend. Calls that timed out before reporting tokens are left out.

## Verify

```sh
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser tests start the production build on port 3000. Free that port before running them.

- [Architecture](docs/ARCHITECTURE.md)
- [Diagnostics](docs/DIAGNOSTICS.md)
- [Branding](docs/BRANDING.md)
- [Future integrations](docs/FUTURE_APIS.md)

## Test accounts

Use **Sign up** with a fictional email such as `demo@example.com` and a test password of at least eight characters. Sign-in opens the workspace and sign-out returns to the landing page. This browser-only prototype stores salted password verifiers locally and uses one shared workspace per browser. Email-only accounts from the earlier prototype need to sign up again.

## Organisations and projects

Use the dashboard header to create organisations, add projects, rename the selected project, and switch between projects. New projects start empty. Import usage or load the demo into the selected project. Usage and recommendation statuses are stored per project, while preferences and pricing are shared in the browser.
