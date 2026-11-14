# Architecture

The Next.js App Router serves a client workspace. Onboarding, dashboard, assistant and branding components share TypeScript records in `types/index.ts`.

The fixture generator and import validator produce the same `UsageEvent` shape. The app filters the active dataset by UTC date, provider, model and application before passing it to analytics and diagnosis. Analytics computes totals and groups for Recharts and tables. Pricing matches exact provider and model names. Unknown rates produce unavailable request estimates and partial totals where some rates are known.

The diagnosis engine consumes one event at a time. It keeps matching cache evidence within each provider, model, application and fingerprint scope. The historical view runs the engine over the filtered dataset. The live simulator maintains its own engine and measures only each call to process an event with the browser performance clock. It maintains the most recent 200 timing measurements. The simulated feed lives in browser memory for the current session.

Recommendations group findings by rule, provider, model and application. They retain links to the request evidence. The browser saves the selected dataset, profile, settings and review statuses under one versioned local storage key.
