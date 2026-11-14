import type { UsageEvent } from "../types";

/**
 * Prompt Lab integration.
 *
 * Prompt Lab records every OpenAI call it makes and serves them, read-only, at
 * `/api/usage/events` behind a bearer token. This module pages through that
 * feed and converts each call into Token Doctor's import contract. It runs on
 * the server (app/api/prompt-lab/route.ts) so the token never reaches the
 * browser.
 */

/** One call as Prompt Lab reports it (server/usage.ts in Prompt Lab). */
export interface PromptLabEvent {
  id: string;
  at: string;
  feature: string;
  model: string;
  ok: boolean;
  usage: {
    inputTokens: number;
    cachedInputTokens: number;
    outputTokens: number;
    reasoningTokens: number;
    totalTokens: number;
  } | null;
  durationMs: number;
  error: string | null;
}

interface EventsPage {
  events: PromptLabEvent[];
  nextCursor: string | null;
}

export const PROMPT_LAB_MAX_DAYS = 90;
const PAGE_SIZE = 1000;
/** 50 pages × 1000 events; stops a misbehaving cursor from looping forever. */
const MAX_PAGES = 50;

const whole = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : 0;

/**
 * Maps Prompt Lab calls to usage events. Calls without token counts (timeouts,
 * network failures) are left out rather than imported as zero-cost requests.
 */
export function toUsageEvents(events: PromptLabEvent[]): {
  events: Omit<UsageEvent, "simulated">[];
  skipped: number;
} {
  const mapped: Omit<UsageEvent, "simulated">[] = [];
  let skipped = 0;
  for (const event of events) {
    if (!event.usage) {
      skipped += 1;
      continue;
    }
    const input = whole(event.usage.inputTokens);
    mapped.push({
      id: `prompt-lab-${event.id}`,
      timestamp: event.at,
      provider: "OpenAI",
      model: event.model,
      application: "Prompt Lab",
      task: event.ok ? event.feature : `${event.feature} (failed)`,
      input,
      output: whole(event.usage.outputTokens),
      cached: Math.min(input, whole(event.usage.cachedInputTokens)),
      latency: whole(event.durationMs),
    });
  }
  return { events: mapped, skipped };
}

export class PromptLabError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PromptLabError";
  }
}

/** Fetches every Prompt Lab call since `since`, following the cursor. */
export async function fetchPromptLabEvents(
  baseUrl: string,
  token: string,
  since: Date,
  fetcher: typeof fetch = fetch,
): Promise<PromptLabEvent[]> {
  const all: PromptLabEvent[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL("/api/usage/events", baseUrl);
    url.searchParams.set("since", since.toISOString());
    url.searchParams.set("limit", String(PAGE_SIZE));
    if (cursor) url.searchParams.set("cursor", cursor);

    let response: Response;
    try {
      response = await fetcher(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
      });
    } catch {
      throw new PromptLabError(`Could not reach Prompt Lab at ${url.origin}.`, 502);
    }

    if (response.status === 401) {
      throw new PromptLabError(
        "Prompt Lab rejected the token. Check PROMPT_LAB_USAGE_TOKEN matches USAGE_API_TOKEN in Prompt Lab.",
        401,
      );
    }
    if (response.status === 404) {
      throw new PromptLabError(
        "Prompt Lab's usage API is not available. Deploy the latest Prompt Lab to Sites and set USAGE_API_TOKEN there.",
        404,
      );
    }
    if (!response.ok) {
      throw new PromptLabError(`Prompt Lab returned ${response.status}.`, 502);
    }

    const body = (await response.json()) as EventsPage;
    if (!Array.isArray(body.events)) {
      throw new PromptLabError("Prompt Lab returned an unexpected response.", 502);
    }
    all.push(...body.events);
    cursor = body.nextCursor;
    if (!cursor) break;
  }
  return all;
}
