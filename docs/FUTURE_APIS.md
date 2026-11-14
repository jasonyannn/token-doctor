# Future integrations

Provider adapters can convert telemetry into `UsageEvent` using the validated import fields as the contract. Preserve provider and model identifiers, report missing optional dimensions explicitly, and pass aggregate token counts and opaque fingerprints without raw prompts. Maintain a versioned snapshot of prices so historical estimates remain reproducible.

The per-event diagnosis engine can run in an ingestion worker. Retain cache group state and request IDs to support deduplication and evidence lookup. Add a separate validation dataset to measure effects of implemented recommendations on equivalent tasks.

Measure actual request latency at a real provider integration. Preserve the distinction between provider request time, application end-to-end time and local diagnostic processing time.
