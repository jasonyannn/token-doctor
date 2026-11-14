import { describe, expect, it } from "vitest";
import {
  fetchPromptLabEvents,
  type PromptLabEvent,
  PromptLabError,
  toUsageEvents,
} from "../lib/promptLab";
import { parseUsage } from "../lib/telemetry";

const call = (overrides: Partial<PromptLabEvent> = {}): PromptLabEvent => ({
  id: "a1",
  at: "2026-11-10T09:15:00.000Z",
  feature: "chat",
  model: "gpt-5.2",
  ok: true,
  usage: {
    inputTokens: 1200,
    cachedInputTokens: 200,
    outputTokens: 300,
    reasoningTokens: 120,
    totalTokens: 1500,
  },
  durationMs: 2400,
  error: null,
  ...overrides,
});

describe("toUsageEvents", () => {
  it("maps calls to the import contract and passes the validator", () => {
    const { events, skipped } = toUsageEvents([
      call(),
      call({ id: "b2", feature: "generate", ok: false }),
    ]);
    expect(skipped).toBe(0);
    expect(events[0]).toEqual({
      id: "prompt-lab-a1",
      timestamp: "2026-11-10T09:15:00.000Z",
      provider: "OpenAI",
      model: "gpt-5.2",
      application: "Prompt Lab",
      task: "chat",
      input: 1200,
      output: 300,
      cached: 200,
      latency: 2400,
    });
    expect(events[1].task).toBe("generate (failed)");
    expect(parseUsage(JSON.stringify(events), "prompt-lab.json")).toHaveLength(2);
  });

  it("leaves out calls without token counts instead of treating them as free", () => {
    const { events, skipped } = toUsageEvents([call(), call({ id: "t", usage: null })]);
    expect(events).toHaveLength(1);
    expect(skipped).toBe(1);
  });
});

describe("fetchPromptLabEvents", () => {
  const since = new Date("2026-11-01T00:00:00.000Z");

  it("follows the cursor and sends the bearer token", async () => {
    const seen: { url: string; auth: string | null }[] = [];
    const pages = [
      { events: [call({ id: "1" })], nextCursor: "c1" },
      { events: [call({ id: "2" })], nextCursor: null },
    ];
    const fetcher = (async (input: URL, init?: RequestInit) => {
      seen.push({
        url: String(input),
        auth: new Headers(init?.headers).get("Authorization"),
      });
      return Response.json(pages[seen.length - 1]);
    }) as typeof fetch;

    const events = await fetchPromptLabEvents("https://lab.test", "secret", since, fetcher);
    expect(events.map((event) => event.id)).toEqual(["1", "2"]);
    expect(seen[0].auth).toBe("Bearer secret");
    expect(seen[0].url).toContain("/api/usage/events?since=2026-11-01T00%3A00%3A00.000Z");
    expect(seen[1].url).toContain("cursor=c1");
  });

  it("explains a wrong token and a missing API", async () => {
    const status = (code: number) =>
      (async () => new Response("{}", { status: code })) as unknown as typeof fetch;
    await expect(
      fetchPromptLabEvents("https://lab.test", "x", since, status(401)),
    ).rejects.toThrow(/rejected the token/);
    await expect(
      fetchPromptLabEvents("https://lab.test", "x", since, status(404)),
    ).rejects.toBeInstanceOf(PromptLabError);
  });
});
