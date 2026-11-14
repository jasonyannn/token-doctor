import {
  fetchPromptLabEvents,
  PROMPT_LAB_MAX_DAYS,
  PromptLabError,
  toUsageEvents,
} from "../../../lib/promptLab";

/*
 * Server-side proxy to Prompt Lab's usage API. The token lives in .env.local
 * (never a NEXT_PUBLIC_ variable), so the browser only ever sees token counts.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const baseUrl = process.env.PROMPT_LAB_URL?.trim();
  const token = process.env.PROMPT_LAB_USAGE_TOKEN?.trim();
  if (!baseUrl || !token) {
    return Response.json(
      {
        error:
          "Prompt Lab is not connected. Add PROMPT_LAB_URL and PROMPT_LAB_USAGE_TOKEN to .env.local and restart Token Doctor.",
      },
      { status: 503 },
    );
  }
  try {
    new URL(baseUrl);
  } catch {
    return Response.json(
      { error: "PROMPT_LAB_URL must be a full URL, e.g. https://your-site.example." },
      { status: 503 },
    );
  }

  const requested = Number(new URL(request.url).searchParams.get("days") ?? 30);
  const days = Math.min(
    PROMPT_LAB_MAX_DAYS,
    Math.max(1, Number.isFinite(requested) ? Math.round(requested) : 30),
  );
  const since = new Date(Date.now() - days * 86_400_000);

  try {
    const { events, skipped } = toUsageEvents(
      await fetchPromptLabEvents(baseUrl, token, since),
    );
    return Response.json(
      { days, events, skipped },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof PromptLabError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("[prompt-lab]", error);
    return Response.json({ error: "Prompt Lab sync failed." }, { status: 502 });
  }
}
